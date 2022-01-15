import Decimal from "decimal.js";

export default class TransformQuery {

    public transform(transformations: any, data: any[]) {
        let groupKeys: string[] = [...transformations.GROUP];
        let applyRules: any[] = transformations.APPLY;
        let groupedData: any[][] = this.groupData(groupKeys, data);
        let appliedGroups: any[] = this.applyRules(applyRules, groupedData);
        return appliedGroups;
    }

    private groupData(keys: string[], data: any[]): any[][] {
        let groupedData: any[][] = [data];
        keys.forEach((key: string) => {
            groupedData = this.groupByKey(key, groupedData);
        });
        return groupedData;
    }

    private groupByKey(key: string, data: any[][]) {
        let groupedByKey: any[][] = [];
        data.forEach((group: any[]) => {
            let groupsByKey: any[][] = this.groupHelper(key, group);
            groupedByKey = groupedByKey.concat(groupsByKey);
        });
        return groupedByKey;
    }

    private groupHelper(key: string, group: any[]): any[][] {
        let groupKey: string = key.substring(key.indexOf("_") + 1, key.length);
        let groupedData: { [valKey: string]: any[] } = {};
        group.forEach((datum: any) => {
            let dVal: string = datum[groupKey].toString();
            if (!Object.keys(groupedData).includes(dVal)) {
                groupedData[dVal] = [datum];
            } else {
                groupedData[dVal].push(datum);
            }
        });
        let groupsOfKey = Object.values(groupedData);
        return groupsOfKey;
    }

    private applyRules(rules: any[], groups: any[][]) {
        let appliedGroups: any[] = [];
        groups.forEach((group: any[]) => {
            let datum = group[0];
            rules.forEach((rule: any[]) => {
                let applyKey: string = Object.keys(rule)[0];
                let applyTokenKey: {string: string} = Object.values(rule)[0];
                let token: string = Object.keys(applyTokenKey)[0];
                let key: string = Object.values(applyTokenKey)[0];
                let applyVal = this.computeRule(token, key.substring(key.indexOf("_") + 1, key.length), group);
                datum[applyKey] = applyVal;
            });
            appliedGroups.push(datum);
        });
        return appliedGroups;
    }

    private computeRule(applyToken: string, tokenKey: string, group: any[]) {
        switch (applyToken) {
            case "MAX":
                return this.computeMax(tokenKey, group);
            case "MIN":
                return this.computeMin(tokenKey, group);
            case "AVG":
                return this.computeAvg(tokenKey, group);
            case "COUNT":
                return this.computeCount(tokenKey, group);
            case "SUM":
                return this.computeSum(tokenKey, group);
        }
    }

    private computeMax(tokenKey: string, group: any[]) {
        let max = Number.NEGATIVE_INFINITY;
        group.forEach((datum: any) => {
            if (datum[tokenKey] > max) {
                max = datum[tokenKey];
            }
        });
        return max;
    }

    private computeMin(tokenKey: string, group: any[]) {
        let min = Number.POSITIVE_INFINITY;
        group.forEach((datum: any) => {
            if (datum[tokenKey] < min) {
                min = datum[tokenKey];
            }
        });
        return min;
    }

    private computeAvg(tokenKey: string, group: any[]) {
        let sum: Decimal = new Decimal(0);
        group.forEach((datum: any) => {
            sum = sum.add(new Decimal(datum[tokenKey]));
        });
        return Number((sum.toNumber() / group.length).toFixed(2));
    }

    private computeCount(tokenKey: string, group: any[]) {
        let distinctDatum: any[] = [];
        group.forEach((datum: any) => {
            if (!distinctDatum.includes(datum[tokenKey])) {
                distinctDatum.push(datum[tokenKey]);
            }
        });
        return distinctDatum.length;
    }

    private computeSum(tokenKey: string, group: any[]) {
        let sum: Decimal = new Decimal(0);
        group.forEach((datum: any) => {
            sum = sum.add(new Decimal(datum[tokenKey]));
        });
        return Number(sum.toFixed(2));
    }
}
