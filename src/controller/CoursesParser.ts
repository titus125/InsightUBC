import {InsightCoursesData} from "./IInsightFacade";

export default class CoursesParser {
    public parseJSON(listOfJson: string): InsightCoursesData[] {
        let ret = [];
        let obj = JSON.parse(listOfJson);
        if (obj.result != null) {
            for (let json of obj.result) {
                let courseData: InsightCoursesData = {
                    dept: json["Subject"],
                    id: json["Course"],
                    avg: json["Avg"],
                    instructor: json["Professor"],
                    title: json["Title"],
                    pass: json["Pass"],
                    fail: json["Fail"],
                    audit: json["Audit"],
                    uuid: json["id"].toString(),
                    year: json["Section"] === "overall" ? 1900 : parseInt(json["Year"], 10)
                };
                ret.push(courseData);
            }
        }
        return ret;
    }
}
