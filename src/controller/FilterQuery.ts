import {InsightCoursesData, InsightDatasetKind, InsightRoomsData} from "./IInsightFacade";
import Log from "../Util";

export default class FilterQuery {

    private readonly dataKind: InsightDatasetKind;

    constructor(kind: InsightDatasetKind) {
        Log.trace("FilterQuery::init()");
        this.dataKind = kind;
    }

    public filterQuery(where: any, data: InsightCoursesData[] | InsightRoomsData[]) {
        let ret = data;
        Object.keys(where).forEach((filter) => {
            if (filter === "AND") {
                ret = this.ANDfilter(where["AND"], ret);
            } else if (filter === "OR") {
                ret = this.ORfilter(where["OR"], ret);
            } else if (filter === "LT") {
                ret = this.LTfilter(where["LT"], ret);
            } else if (filter === "GT") {
                ret = this.GTfilter(where["GT"], ret);
            } else if (filter === "EQ") {
                ret = this.EQfilter(where["EQ"], ret);
            } else if (filter === "IS") {
                ret = this.ISfilter(where["IS"], ret);
            } else if (filter === "NOT") {
                ret = this.NOTfilter(where["NOT"], ret);
            }
        });
        return ret;
    }

    private ANDfilter(query: any, data: InsightCoursesData[] | InsightRoomsData[]) {
        let arr: any[] = [];
        query.forEach((value: object) => {
            let filteredQuery = this.filterQuery(value, data);
            arr.push(filteredQuery);
        });
        return arr.reduce((a, b) => a.filter((c: any) => b.includes(c)));
    }

    private ORfilter(query: any, data: InsightCoursesData[] | InsightRoomsData[]) {
        let arr: any = [];
        query.forEach((value: object) => {
            let filteredQuery = this.filterQuery(value, data);
            arr = arr.concat(filteredQuery);
        });
        let mySet = new Set(arr);
        arr = Array.from(mySet);
        return arr;
    }

    private LTfilter(query: any, data: InsightCoursesData[] | InsightRoomsData[]) {
        let ret: InsightCoursesData[] = [];
        let field = Object.keys(query)[0];
        let value = query[field];
        let underScorePos = field.indexOf("_");
        field = field.substring(underScorePos + 1);
        data.forEach((datum: any) => {
            if (this.getProperty(datum, field) < value) {
                ret.push(datum);
            }
        });
        return ret;
    }


    private GTfilter(query: any, data: InsightCoursesData[] | InsightRoomsData[]) {
        let ret: InsightCoursesData[] = [];
        let field = Object.keys(query)[0];
        let value = query[field];
        let underScorePos = field.indexOf("_");
        field = field.substring(underScorePos + 1);
        data.forEach((datum: any) => {
            if (this.getProperty(datum, field) > value) {
                ret.push(datum);
            }
        });
        return ret;
    }

    private EQfilter(query: any, data: InsightCoursesData[] | InsightRoomsData[]) {
        let ret: InsightCoursesData[] = [];
        let field = Object.keys(query)[0];
        let value = query[field];
        let underScorePos = field.indexOf("_");
        field = field.substring(underScorePos + 1);
        data.forEach((datum: any) => {
            if (this.getProperty(datum, field) === value) {
                ret.push(datum);
            }
        });
        return ret;
    }

    private ISfilter(query: any, data: InsightCoursesData[] | InsightRoomsData[]) {
        let ret: InsightCoursesData[] = [];
        let field = Object.keys(query)[0];
        let value = query[field];
        let underScorePos = field.indexOf("_");
        field = field.substring(underScorePos + 1);
        if (value === "**" || value === "*") {
            return data;
        }
        data.forEach((datum: any) => {
            let needMatch = this.getProperty(datum, field) as string;
            if ((value.charAt(0) === "*") && (value.charAt(value.length - 1) === "*")) {
                if (needMatch.includes(value.substring(1, value.length - 1))) {
                    ret.push(datum);
                }
            } else if (value.charAt(0) === "*") {
                needMatch = needMatch.substring(needMatch.length - value.length + 1);
                if (needMatch === value.substring(1)) {
                    ret.push(datum);
                }
            } else if (value.charAt(value.length - 1) === "*") {
                needMatch = needMatch.substring(0, value.length - 1);
                if (needMatch === value.substring(0, value.length - 1)) {
                    ret.push(datum);
                }
            } else {
                if (needMatch === value) {
                    ret.push(datum);
                }
            }
        });
        return ret;
    }

    private NOTfilter(query: any, data: any) {
        let arr = this.filterQuery(query, data);
        return data.filter((datum: any) => !arr.includes(datum));
    }

    public filterColumns(columns: any, data: any[]) {
        let ret: any[] = [];
        data.forEach((datum) => {
            let obj: any = {};
            Object.values(columns).forEach((col: string) => {
                if (col.includes("_")) {
                    let field = col.substring(col.indexOf("_") + 1);
                    obj[col] = datum[field];
                } else {
                    obj[col] = datum[col];
                }
            });
            ret.push(obj);
        });
        return ret;
    }

    private getProperty(datum: InsightCoursesData & InsightRoomsData, property: string) {
        if (this.dataKind === InsightDatasetKind.Courses) {
            if (property === "dept") {
                return datum.dept;
            } else if (property === "id") {
                return datum.id;
            } else if (property === "avg") {
                return datum.avg;
            } else if (property === "instructor") {
                return datum.instructor;
            } else if (property === "title") {
                return datum.title;
            } else if (property === "pass") {
                return datum.pass;
            } else if (property === "fail") {
                return datum.fail;
            } else if (property === "audit") {
                return datum.audit;
            } else if (property === "uuid") {
                return datum.uuid;
            } else if (property === "year") {
                return datum.year;
            }
        } else {
            if (property === "fullname") {
                return datum.fullname;
            } else if (property === "shortname") {
                return datum.shortname;
            } else if (property === "number") {
                return datum.number;
            } else if (property === "name") {
                return datum.name;
            } else if (property === "address") {
                return datum.address;
            } else if (property === "lat") {
                return datum.lat;
            } else if (property === "lon") {
                return datum.lon;
            } else if (property === "seats") {
                return datum.seats;
            } else if (property === "type") {
                return datum.type;
            } else if (property === "furniture") {
                return datum.furniture;
            } else if (property === "href") {
                return datum.href;
            }
        }
    }
}
