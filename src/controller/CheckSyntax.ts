import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import CheckSyntaxHelpers from "./CheckSyntaxHelpers";
import Log from "../Util";
export default class CheckSyntax {
    private emptyWhere: boolean = false;
    public id: string;
    private mFieldCourses: string[] = ["avg", "pass", "fail", "audit", "year"];
    private sFieldCourses: string[] = ["dept", "id", "instructor", "title", "uuid"];
    private mFieldRooms: string[] = ["lat", "lon", "seats"];
    private sFieldRooms: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    public mField: string[] = this.mFieldCourses.concat(this.mFieldRooms);
    public sField: string[] = this.sFieldCourses.concat(this.sFieldRooms);
    private applyKeys: string[] = [];
    private groupKeys: string[] = [];
    private inColumns: string[] = [];
    public hasOrder: boolean = false;
    public hasTransform: boolean = false;

    public checkQuerySyntax(query: any) {
        if (query === null || query === undefined || query.constructor.name !== "Object") {
            throw new InsightError("Query is null/undefined/!Object");
        }
        if (Object.keys(query).length > 3) {
            throw new InsightError("Keys length too large");
        }
        if (!query.hasOwnProperty("WHERE") || !query.hasOwnProperty("OPTIONS")) {
            throw new InsightError("Missing WHERE/OPTIONS");
        }
        if (query.hasOwnProperty("TRANSFORMATIONS")) {
            this.hasTransform = true;
            this.checkTransformationsSyntax(query["TRANSFORMATIONS"]);
        } else {
            if (Object.keys(query).length > 2) {
                throw new InsightError("Keys length too large");
            }
        }
        this.checkWhereSyntax(query["WHERE"]);
        this.checkOptionsSyntax(query["OPTIONS"]);
        return this.id;
    }

    private checkLogicComparisonSyntax(logic: any) {
        if (logic.constructor.name !== "Array" && Object.values(logic).length < 1) {
            throw new InsightError("Logic not array or " + Object.keys(logic) + " has no keys");
        }
        Object.values(logic).forEach((filter) => this.checkFilterSyntax(filter));
    }

    private checkMComparisonSyntax(mCompare: any) {
        if (mCompare.constructor.name !== "Object" || Object.values(mCompare).length !== 1) {
            throw new InsightError("More than one key in " + mCompare);
        }
        let mkey = Object.keys(mCompare)[0];
        let underScorePos = mkey.indexOf("_");
        let idString = mkey.substring(0, underScorePos);
        if (underScorePos === -1) {
            throw new InsightError("Invalid mkey");
        }
        if (!this.id) {
            this.id = idString;
        } else if (this.id !== idString) {
            throw new InsightError("Attempting to reference multiple datasets");
        }
        let validFields = this.id === InsightDatasetKind.Courses ? this.mFieldCourses : this.mFieldRooms;
        if (!validFields.includes(mkey.substring(underScorePos + 1))) {
            throw new InsightError(mkey.substring(underScorePos + 1)
                + " is not a valid mkey");
        }
        let num = Object.values(mCompare)[0];
        if (typeof(num) !== "number") {
            throw new InsightError(num + " is not a number");
        }
        return;
    }

    private checkSComparisonSyntax(sCompare: any) {
        if (sCompare.constructor.name !== "Object" || Object.values(sCompare).length !== 1) {
            throw new InsightError("More than one key in " + sCompare);
        }
        let skey = Object.keys(sCompare)[0];
        let underScorePos = skey.indexOf("_");
        let idString = skey.substring(0, underScorePos);
        if (underScorePos === -1 || idString === "") {
            throw new InsightError("Invalid skey");
        }
        if (!this.id) {
            this.id = idString;
        } else if (this.id !== idString) {
            throw new InsightError("Attempting to reference multiple datasets");
        }
        let validFields = this.id === InsightDatasetKind.Courses ? this.sFieldCourses : this.sFieldRooms;
        if (!validFields.includes(skey.substring(underScorePos + 1))) {
            throw new InsightError(skey.substring(underScorePos + 1)
                + " is not a invalid skey");
        }
        let queryString = Object.values(sCompare)[0];
        if (typeof(queryString) !== "string") {
            throw new InsightError(queryString + " is not a string");
        }
        let inputString: string = queryString;
        if (queryString === "**" || queryString === "*") {
            return;
        } else if ((queryString.charAt(0) === "*") && (queryString.charAt(queryString.length - 1) === "*")) {
            inputString = queryString.substring(1, queryString.length - 1);
        } else if (queryString.charAt(0) === "*") {
            inputString = queryString.substring(1);
        } else if (queryString.charAt(queryString.length - 1) === "*") {
            inputString = queryString.substring(0, queryString.length - 1);
        }
        if (inputString.includes("*")) {
            throw new InsightError("Invalid input string");
        }
        return;
    }

    private checkNegationSyntax(where: any) {
        this.checkFilterSyntax(where);
    }

    private checkFilterSyntax(filter: any) {
        if (filter.constructor.name !== "Object" || Object.keys(filter).length > 1) {
            throw new InsightError("More than one filter");
        }
        if ((filter.hasOwnProperty( "AND")) || (filter.hasOwnProperty( "OR"))) {
            this.checkLogicComparisonSyntax(Object.values(filter)[0]);
        } else if ((filter.hasOwnProperty( "LT")) || (filter.hasOwnProperty( "GT"))
            || (filter.hasOwnProperty( "EQ"))) {
            this.checkMComparisonSyntax(Object.values(filter)[0]);
        } else if (filter.hasOwnProperty( "IS")) {
            this.checkSComparisonSyntax(Object.values(filter)[0]);
        } else if (filter.hasOwnProperty( "NOT")) {
            this.checkNegationSyntax(Object.values(filter)[0]);
        } else {
            throw new InsightError("Invalid filter " + filter);
        }
    }

    private checkWhereSyntax(where: any) {
        if (where.constructor.name === "Object") {
            if (Object.keys(where).length === 0) {
                this.emptyWhere = true;
                return;
            }
        } else {
            throw new InsightError("Where must be an object");
        }
        this.checkFilterSyntax(where);
    }

    private checkOptionsSyntax(options: any) {
        if (options.constructor.name === "Object") {
            if (Object.keys(options).length !== 1) {
                if (!(Object.keys(options).length === 2 && options.hasOwnProperty("ORDER"))) {
                    throw new InsightError("Key length of OPTION invalid");
                }
                this.hasOrder = true;
            }
        } else {
            throw new InsightError("Options must be an object");
        }
        if (!options.hasOwnProperty("COLUMNS")) {
            throw new InsightError("Missing COLUMNS");
        }
        this.checkColumnsSyntax(options["COLUMNS"]);
        if (this.hasOrder) {
            this.checkOrderSyntax(options["ORDER"]);
        }
    }

    private checkColumnsSyntax(columns: any) {
        if (columns.constructor.name !== "Array" && Object.values(columns).length === 0) {
            throw new InsightError("COLUMNS is empty");
        }
        if (this.hasTransform) {
            for (let key of columns) {
                if (!this.groupKeys.includes(key) && !this.applyKeys.includes(key)) {
                    throw new InsightError("COLUMN key " + key + " not included in GROUP or APPLY ");
                } else {
                    this.inColumns.push(key);
                }
            }
        } else {
            let idString = columns[0];
            let underScorePos = idString.indexOf("_");
            idString = idString.substring(0, underScorePos);

            if (!this.id) {
                this.id = idString;
            } else if (this.id !== idString) {
                throw new InsightError("Attempting to reference multiple datasets");
            }
            this.checkKeys(columns, this.inColumns);
        }
    }

    private checkOrderSyntax(order: any) {
        if ((order === null) || (order === undefined)) {
            throw new InsightError("ORDER undefined");
        }
        if (order.constructor.name === "Object") {
            if (Object.keys(order).length !== 2 || !order.hasOwnProperty("dir") || !order.hasOwnProperty("keys")) {
                throw new InsightError("ORDER not valid");
            }
            if ((order.dir !== "UP" && order.dir !== "DOWN") || order.keys.constructor.name !== "Array"
                || order.keys.length < 1) {
                throw new InsightError("Order dir or keys invalid");
            }
            order.keys.forEach((key: string) => {
                    if (!this.inColumns.includes(key)) {
                        throw new InsightError("Invalid key in order");
                    }
            });
        } else if (typeof(order) === "string") {
            if (!this.inColumns.includes(order)) {
                throw new InsightError("Invalid key in order");
            }
        } else {
            throw new InsightError("Invalid order type");
        }
        return;
    }

    private checkTransformationsSyntax(transformations: any) {
        if (transformations.constructor.name === "Object") {
            if (Object.keys(transformations).length !== 2) {
                throw new InsightError("TRANSFORMATIONS does not have 2 keys");
            }
        } else {
            throw new InsightError("Transformations must be an object");
        }
        if (!transformations.hasOwnProperty("GROUP")) {
            throw new InsightError("TRANSFORMATIONS missing GROUP");
        }
        if (!transformations.hasOwnProperty("APPLY")) {
            throw new InsightError("TRANSFORMATIONS missing APPLY");
        }
        this.checkGroupSyntax(transformations["GROUP"]);
        this.checkApplySyntax(transformations["APPLY"]);
    }

    private checkGroupSyntax(group: any) {
        if (group.constructor.name !== "Array" || group.length < 1) {
            throw new InsightError("GROUP must be a non-empty array");
        }
        let idString = group[0];
        let underScorePos = idString.indexOf("_");
        idString = idString.substring(0, underScorePos);
        for (const key of group) {
            if (typeof(key) !== "string") {
                throw new InsightError("GROUP keys must be strings");
            }
            if (!this.id) {
                this.id = idString;
            } else if (this.id !== idString) {
                throw new InsightError("Attempting to reference multiple datasets");
            }
        }
        this.checkKeys(group, this.groupKeys);
    }

    private checkApplySyntax(apply: any) {
        if (apply.constructor.name !== "Array") {
            throw new InsightError("GROUP must be an array");
        }
        let helpers = new CheckSyntaxHelpers();
        let mFields = this.id === InsightDatasetKind.Courses ? this.mFieldCourses : this.mFieldRooms;
        let sFields = this.id === InsightDatasetKind.Courses ? this.sFieldCourses : this.sFieldRooms;
        this.applyKeys = helpers.checkApplyRulesSyntax(apply, this.id, mFields, sFields);
    }

    private checkKeys(keys: any, array: any) {
        let courses = false;
        let rooms = false;
        let validKeysCourses = this.mFieldCourses.concat(this.sFieldCourses);
        validKeysCourses = validKeysCourses.map((field) => this.id + "_" + field);
        let validKeysRooms = this.mFieldRooms.concat(this.sFieldRooms);
        validKeysRooms = validKeysRooms.map((field) => this.id + "_" + field);
        Object.values(keys).forEach((key) => {
            if (typeof key === "string") {
                array.push(key);
            }
            if (validKeysCourses.includes(key as string)) {
                if (rooms) {
                    throw new InsightError("Keys from courses and rooms datasets");
                }
                courses = true;
            } else if (validKeysRooms.includes(key as string)) {
                if (courses) {
                    throw new InsightError("Keys from courses and rooms datasets");
                }
                rooms = true;
            } else {
                throw new InsightError("Invalid key " + key);
            }
        });
    }
}
