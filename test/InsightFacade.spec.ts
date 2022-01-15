import * as chai from "chai";
import { expect } from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any; // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string; // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses_1: "./test/data/courses_1.zip",
        NoCourses: "./test/data/NoCourses.zip",
        noJson: "./test/data/noJson.zip",
        OneCourse: "./test/data/OneCourse.zip",
        OneCourseWithInvalidFiles: "./test/data/OneCourseWithInvalidFiles.zip",
        sample1: "./test/data/sample1.zip",
        sample2: "./test/data/sample2.zip",
        sample3: "./test/data/sample3.zip",
        rooms: "./test/data/rooms.zip",
        rooms2: "./test/data/RoomsTest.zip",
        invalidURL: "./test/data/roomsInvalidURL.zip",
        invalidURLWithOtherRooms: "./test/data/roomsInvalidURLWithOtherCourses.zip",
        oneRoom: "./test/data/containEmptyBuildings.zip",
        noRooms: "./test/data/noRooms.zip",
        invalidHTMLRooms: "./test/data/invalidHTML.zip",
        noIndex: "./test/data/noIndex.zip",
        notLinked: "./test/data/notLinked.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        chai.use(chaiAsPromised);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs
                .readFileSync(datasetsToLoad[id])
                .toString("base64");
        }
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });


    it("Should add a valid rooms dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should add a valid rooms dataset of one room", function () {
        const id: string = "rooms2";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should fail because only room has invalidURL", function () {
        const id: string = "invalidURL";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail because there's no index", function () {
        const id: string = "noIndex";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should still pass with an invalid html because there are other valid rooms", function () {
        const id: string = "invalidHTMLRooms";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should still pass because there are other valid rooms", function () {
        const id: string = "invalidURLWithOtherRooms";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should skip over HEBB that is not in index", function () {
        const myDataset: InsightDataset = {
            id: "notLinked",
            kind: InsightDatasetKind.Rooms,
            numRows: 3,
        };
        const id = "notLinked";
        const futureResult: Promise<InsightDataset[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Rooms)
            .then(() => insightFacade.listDatasets());
        return expect(futureResult).to.eventually.deep.equal([myDataset]);
    });

    it("Should still pass even if there are buildings with empty rooms", function () {
        const id: string = "oneRoom";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should add a valid dataset and ignore the invalid data", function () {
        const id: string = "OneCourseWithInvalidFiles";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should return an array of the 2 databases added", function () {
        const id: string = "courses";
        const id2: string = "OneCourse";
        const expected: string[] = [id, id2];
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() =>
                    insightFacade.addDataset(
                        id2,
                        datasets[id2],
                        InsightDatasetKind.Courses,
                    ),
                ),
        ).to.eventually.deep.equal(expected);
    });

    it("Should return an array of mixed databases added", function () {
        const id: string = "courses";
        const id2: string = "rooms";
        const expected: string[] = [id, id2];
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() =>
                    insightFacade.addDataset(
                        id2,
                        datasets[id2],
                        InsightDatasetKind.Rooms,
                    ),
                ),
        ).to.eventually.deep.equal(expected);
    });

    it("Should return InsightError if id already in dataset", function () {
        const id: string = "courses";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() =>
                    insightFacade.addDataset(
                        id,
                        datasets[id],
                        InsightDatasetKind.Courses,
                    ),
                ),
        ).to.be.rejectedWith(InsightError);
    });

    it("Should fail adding rooms to courses", function () {
        const id: string = "rooms";
        return expect(
            insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            ),
        ).to.be.rejectedWith(InsightError);
    });

    it("Should fail adding courses to rooms", function () {
        const id: string = "courses";
        return expect(
            insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Rooms,
            ),
        ).to.be.rejectedWith(InsightError);
    });

    it("Should fail if not reading a file", function () {
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            "noJson",
            "noJson",
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail on courses reading a non-zip file", function () {
        let file = fs.readFileSync("package.json").toString("base64");
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            "package.json",
            file,
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail on rooms reading a non-zip file", function () {
        let file = fs.readFileSync("package.json").toString("base64");
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            "package.json",
            file,
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail on reading a zip with no courses", function () {
        const id: string = "NoCourses";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail on reading a zip with no rooms", function () {
        const id: string = "noRooms";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });


    it("Should fail on reading an id with only underscores", function () {
        const id: string = "sample1";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            "__",
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail on reading an id containing an underscore", function () {
        const id: string = "sample1";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            "sample_1",
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail on reading an id with empty string", function () {
        const id: string = "sample1";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            "",
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail on reading an id with multiple whitespaces", function () {
        const id: string = "sample1";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            "     ",
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail if there are no JSON files in zip", function () {
        const id: string = "noJson";
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should fail when trying to remove courses on empty database", function () {
        const futureResult: Promise<string> = insightFacade.removeDataset(
            "courses",
        );
        return expect(futureResult).to.be.rejectedWith(
            NotFoundError,
        );
    });

    it("Should fail when trying to remove rooms on empty database", function () {
        const futureResult: Promise<string> = insightFacade.removeDataset(
            "rooms",
        );
        return expect(futureResult).to.be.rejectedWith(
            NotFoundError,
        );
    });

    it("Should fail when trying to remove courses with an id not yet added", function () {
        const id: string = "OneCourse";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset("courses")),
        ).to.be.rejectedWith(NotFoundError);
    });

    it("Should fail when trying to remove rooms with an id not yet added", function () {
        const id: string = "rooms2";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Rooms)
                .then(() => insightFacade.removeDataset("rooms")),
        ).to.be.rejectedWith(NotFoundError);
    });

    it("Should fail on removing an id with only underscores", function () {
        const id: string = "OneCourse";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset("__")),
        ).to.be.rejectedWith(InsightError);
    });

    it("Should fail on removing an id containing an underscore", function () {
        const id: string = "OneCourse";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset("courses_1")),
        ).to.be.rejectedWith(InsightError);
    });

    it("Should fail on removing an id with empty string", function () {
        const id: string = "OneCourse";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset("")),
        ).to.be.rejectedWith(InsightError);
    });

    it("Should fail on removing an id with multiple whitespaces", function () {
        const id: string = "OneCourse";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset("     ")),
        ).to.be.rejectedWith(InsightError);
    });

    it("Should remove the only dataset in the database", function () {
        const id: string = "OneCourse";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset(id)),
        ).to.eventually.deep.equal(id);
    });

    it("Should remove one dataset from larger database", function () {
        const id: string = "sample1";
        const id2: string = "sample2";
        const id3: string = "sample3";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() =>
                    insightFacade.addDataset(
                        id2,
                        datasets[id2],
                        InsightDatasetKind.Courses,
                    ),
                )
                .then(() =>
                    insightFacade.addDataset(
                        id3,
                        datasets[id3],
                        InsightDatasetKind.Courses,
                    ),
                )
                .then(() => insightFacade.removeDataset("sample1"))
        ).to.eventually.deep.equal("sample1");
    });

    it("Should return an error if performQuery on empty database", function () {
        return expect(
            insightFacade
                .performQuery("/queries/simple.json"),
        ).to.be.rejectedWith(InsightError);
    });

    it("Should return an error if query not a json", function () {
        const id: string = "OneCourse";
        return expect(
            insightFacade
                .addDataset(id, datasets[id], InsightDatasetKind.Courses)
                .then(() => insightFacade.performQuery("./README.md"))
        ).to.be.rejectedWith(InsightError);
    });

    it("Should return an empty array", function () {
        const futureResult: Promise<
            InsightDataset[]
        > = insightFacade.listDatasets();
        return expect(futureResult).to.eventually.deep.equal([]);
    });

    it("Should return an array with one InsightDataset", function () {
        const myDataset: InsightDataset = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const id = "courses";
        const futureResult: Promise<InsightDataset[]> = insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => insightFacade.listDatasets());
        return expect(futureResult).to.eventually.deep.equal([myDataset]);
    });

    it("Should return an array with multiple InsightDatasets", function () {
        const myDataset: InsightDataset = {
            id: "courses1",
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const myDataset2: InsightDataset = {
            id: "courses2",
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const futureResult: Promise<InsightDataset[]> = insightFacade
            .addDataset(
                "courses1",
                datasets["courses"],
                InsightDatasetKind.Courses,
            )
            .then(() =>
                insightFacade.addDataset(
                    "courses2",
                    datasets["courses"],
                    InsightDatasetKind.Courses,
                ),
            )
            .then(() => insightFacade.listDatasets());
        return expect(futureResult).to.eventually.deep.equal([
            myDataset,
            myDataset2,
        ]);
    });

    it("Should fail trying to add rooms to courses", function () {
        const myDataset: InsightDataset = {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        };
        const myDataset2: InsightDataset = {
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            numRows: 364,
        };
        const futureResult: Promise<InsightDataset[]> = insightFacade
            .addDataset(
                "courses",
                datasets["courses"],
                InsightDatasetKind.Courses,
            )
            .then(() =>
                insightFacade.addDataset(
                    "rooms",
                    datasets["rooms"],
                    InsightDatasetKind.Rooms,
                ),
            )
            .then(() => insightFacade.listDatasets());
        return expect(futureResult).to.eventually.deep.equal([
            myDataset,
            myDataset2,
        ]);
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: {
        [id: string]: { path: string; kind: InsightDatasetKind };
    } = {
        courses: {
            path: "./test/data/courses.zip",
            kind: InsightDatasetKind.Courses,
        },
        sample1: {
            path: "./test/data/sample1.zip",
            kind: InsightDatasetKind.Courses,
        },
        rooms: {
            path: "./test/data/rooms.zip",
            kind: InsightDatasetKind.Rooms,
        },
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        chai.use(chaiAsPromised);
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more test queries. ${err}`,
            );
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(
                insightFacade.addDataset(id, data, ds.kind),
            );
        }
        return Promise.all(loadDatasetPromises);
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });


    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                // if (test.title === "yoyo") {
                //     insightFacade.performQuery(test.query).then((result) => console.log(result));
                // }
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<
                        any[]
                        > = insightFacade.performQuery(test.query);
                    return TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    });
});
