export default class SortQuery {

    public sortQuery(order: any, data: any[], sField: string[]) {

        function compareNumbers(num1: any, num2: any) {
            return num1 - num2;
        }

        function compareStrings(str1: any, str2: any) {
            return str1.localeCompare(str2);
        }

        function getField(key: string) {
            let field = key;
            if (key.includes("_")) {
                let underScorePos = key.indexOf("_");
                field = key.substring(underScorePos + 1);
            }
            return field;
        }

        function compareFunction(course1: any, course2: any) {
            let field: string;
            let dir = "UP";
            let keys: any[];
            if (typeof(order) === "string") {
                keys = [order];
            } else {
                dir = order.dir;
                keys = order.keys;
            }
            for (let key of keys) {
                let compVal = 0;
                field = getField(key);
                if (sField.includes(field)) {
                    compVal = compareStrings(course1[key], course2[key]);
                } else {
                    compVal = compareNumbers(course1[key], course2[key]);
                }
                if (compVal !== 0) {
                    return (dir !== "UP") ? 0 - compVal : compVal;
                }
            }
            return 0;
        }

        return data.sort(compareFunction);
    }

}
