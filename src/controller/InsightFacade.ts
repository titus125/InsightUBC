import Log from "../Util";
import {
    IInsightFacade, InsightCoursesData,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    InsightMemory,
    InsightRoomsData,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import * as JSZip from "jszip";
import * as fs from "fs-extra";
import CheckSyntax from "./CheckSyntax";
import FilterQuery from "./FilterQuery";
import SortQuery from "./SortQuery";
import RoomsParser from "./RoomsParser";
import CoursesParser from "./CoursesParser";
import TransformQuery from "./TransformQuery";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private datasetsInMemory: { [key: string]: InsightMemory } = {};
    private dataSet: { [key: string]: InsightDataset} = {};
    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    private static isIdValid(id: string) {
        return !(id == null || id.includes("_") || id.trim() === "");
    }

    private static isKindValid(kind: InsightDatasetKind) {
        if (kind == null) {
            return false;
        } else {
            return (kind === InsightDatasetKind.Courses || kind === InsightDatasetKind.Rooms);
        }
    }

    private static isContentValid(content: string) {
        return (content != null);
    }

    private isInDisk(id: string): boolean {
        let inDisk = false;
        this.listDatasets().then((results: InsightDataset[]) => {
            if (results.length >= 1) {
                for (let dataset of results) {
                    if (id === dataset.id) {
                        inDisk = true;
                        break;
                    }
                }
            }
        });
        return inDisk;
    }

    private isInMemory(id: string) {
        return (id in this.datasetsInMemory);
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (!InsightFacade.isIdValid(id) || !InsightFacade.isContentValid(content)) {
            return Promise.reject(new InsightError("Invalid id or content"));
        }
        if (this.isInDisk(id)) {
            if (!this.isInMemory(id)) {
                return Promise.reject(new InsightError("Already in disk but not in memory"));
            }
            return Promise.reject(new InsightError("Already exists in disk and memory"));
        }
        if (this.isInMemory(id)) {
            return Promise.reject(new InsightError("Already in memory but not in disk"));
        }
        if (!InsightFacade.isKindValid(kind)) {
            return Promise.reject("Invalid kind");
        }
        if (kind === InsightDatasetKind.Courses) {
            return this.addCoursesDataSet(id, content);
        } else {
            return this.addRoomsDataSet(id, content);
        }
    }

    private addCoursesDataSet(id: string, content: string) {
        let newCoursesData: InsightCoursesData[] = [];
        return new Promise<string[]>((resolve, reject) => {
            let promises: Array<Promise<InsightCoursesData[]>> = [];
            JSZip.loadAsync(content, {base64: true}).then(handleCourseZip).then(() => {
                if (newCoursesData.length === 0) {
                    return reject(new InsightError("Parsing courses failed"));
                } else {
                    this.storeData(id, newCoursesData, InsightDatasetKind.Courses).then((stored) => {
                        return stored ? resolve(Object.keys(this.datasetsInMemory)) :
                            reject(new InsightError("Couldn't write file"));
                    }).catch((e) => {
                        throw new InsightError(e);
                    });
                }
            }).catch((e) => {
                return reject(new InsightError(e));
            });
            function handleCourseZip(zip: any) {
                Object.keys(zip.files).forEach(function (filename) {
                    let promised = new Promise<InsightCoursesData[]>((resolve1, reject1) => {
                        zip.files[filename].async("text").then(function (fileData: string) {
                            try {
                                let coursesParser = new CoursesParser();
                                newCoursesData = newCoursesData.concat(coursesParser.parseJSON(fileData));
                                resolve1();
                            } catch (e) {
                                resolve1();
                            }
                        }).catch((e: any) => {
                            return reject1(new InsightError(e));
                        });
                    });
                    promises.push(promised);
                });
                return Promise.all(promises);
            }
        }).catch((error) => {
            return Promise.reject(new InsightError(error));
        });
    }

    private handleRoomZip(zip: any, html: any) {
        let promises: Array<Promise<InsightRoomsData>> = [];
        let waitForStuff: Array<Promise<any>> = [];
        Object.keys(zip.files).forEach(function (filename) {
            let waitFor = new Promise((resolve2) =>  {
                zip.files[filename].async("text").then(function (fileData: string) {
                    try {
                        let matchingString = "rooms/campus/discover/buildings-and-classrooms/";
                        if (filename.includes(matchingString) && (filename !== matchingString)
                            && (!filename.includes("."))) {
                            let roomParser = new RoomsParser();
                            let buildingName = filename.replace(matchingString, "");
                            if (roomParser.verifyInHTML(buildingName, html)) {
                                promises = promises.concat(roomParser.parseHTML(fileData));
                            }
                        }
                    } catch (e) {
                        // do nothing
                    }
                    resolve2();
                }).catch((e: any) => {
                    throw new InsightError(e);
                });
            });
            waitForStuff.push(waitFor);
        });
        return Promise.all(waitForStuff).then(() => {
            return Promise.all(promises);
        }).catch((e) => {
            throw new InsightError(e);
        });
    }

    private static filterErrorRooms(rooms: InsightRoomsData[]) {
        return rooms.filter((room) => (room["lat"] !== -1) && (room["lon"] !== -1));
    }

    private addRoomsDataSet(id: string, content: string) {
        let newR: InsightRoomsData[] = [], html: any, zipFile: any, that = this;
        return new Promise<string[]>((resolve, reject) => {
            JSZip.loadAsync(content, {base64: true}).then(getHTML).then(() => {
                if (!html) {
                    reject("index.htm not found");
                } else {
                    return this.handleRoomZip(zipFile, html).then((rooms) => {
                        newR = InsightFacade.filterErrorRooms(rooms);
                    }).then(validate).catch((e) => {
                       return reject(new InsightError(e));
                   });
                    function validate() {
                        if (newR.length === 0) {
                            return reject(new InsightError("Parsing rooms failed"));
                        } else {
                            that.storeData(id, newR, InsightDatasetKind.Rooms).then((stored) => {
                                return stored ? resolve(Object.keys(that.datasetsInMemory)) :
                                    reject(new InsightError("Couldn't write file"));
                            }).catch((e: any) => {
                                throw new InsightError(e);
                            });
                        }
                    }
                }
            }).catch((e) => {
                return reject(new InsightError(e));
            });
            function getHTML(zip: any) {
                zipFile = zip;
                let promises2: any[] = [];
                Object.keys(zip.files).forEach(function (filename) {
                    let promised = new Promise((resolve2) => {
                        zip.files[filename].async("text").then(function (fileData: string) {
                            if (filename === "rooms/index.htm") {
                                html = fileData;
                            }
                            resolve2();
                        }).catch((e: any) => {
                            throw new InsightError(e);
                        });
                    });
                    promises2.push(promised);
                });
                return Promise.all(promises2);
            }
        }).catch((e) => {
            return Promise.reject(new InsightError(e));
        });
    }

    private storeData(id: string,
                      newData: InsightCoursesData[] | InsightRoomsData[], kind: InsightDatasetKind) {
        const newMemorySet: InsightMemory = {
            id: id,
            data: newData,
            kind: kind,
            numRows: newData.length,
        };
        const newDataSet: InsightDataset = {
            id: id,
            kind: kind,
            numRows: newData.length,
        };
        this.datasetsInMemory[id] = newMemorySet;
        this.dataSet[id] = newDataSet;

        return fs.writeFile("./data/" + id + ".json", JSON.stringify(newData)).then(() => {
            return true;
        }).catch((e) => {
            Log.trace(e);
            return false;
        });
    }

    public removeDataset(id: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!InsightFacade.isIdValid(id)) {
                return reject(new InsightError());
            }
            if (!(id in this.datasetsInMemory)) {
                if (!fs.existsSync("./data/" + id + ".json")) {
                    return reject(new NotFoundError("id not found"));
                }
                delete this.dataSet[id];
                fs.unlinkSync("./data/" + id + ".json");
                return resolve(id);
            }
            delete this.datasetsInMemory[id];
            delete this.dataSet[id];
            fs.unlinkSync("./data/" + id + ".json");
            return resolve(id);
        });
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>( (resolve, reject) => {
            try {
                let checkSyntax = new CheckSyntax();
                let id = checkSyntax.checkQuerySyntax(query);
                let data = this.datasetsInMemory[id];
                let filterQuery = new FilterQuery(data.kind);
                let filteredData = filterQuery.filterQuery(query["WHERE"], data.data);
                if (checkSyntax.hasTransform) {
                    let transformQuery = new TransformQuery();
                    filteredData = transformQuery.transform(query["TRANSFORMATIONS"], filteredData);
                }
                filteredData = filterQuery.filterColumns(query["OPTIONS"]["COLUMNS"], filteredData);
                if (filteredData.length > 5000) {
                    return reject(new ResultTooLargeError("Result too large"));
                } else {
                    if (checkSyntax.hasOrder) {
                        let sortQuery = new SortQuery();
                        filteredData = sortQuery.sortQuery(query["OPTIONS"]["ORDER"], filteredData, checkSyntax.sField);
                    }
                }
                return resolve(filteredData);
            } catch (e) {
                return reject(new InsightError(e));
            }
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise<InsightDataset[]>((resolve) => {
                resolve(Object.values(this.dataSet));
            }
        );
    }
}
