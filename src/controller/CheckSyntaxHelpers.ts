import {InsightDatasetKind, InsightError} from "./IInsightFacade";
export default class CheckSyntaxHelpers {

    private validTokens = ["MAX", "MIN", "AVG", "SUM", "COUNT"];
    private supportString = ["COUNT"];

    public checkApplyRulesSyntax(applyRules: any, id: string, mFields: string[], sFields: string[]) {
        let applyKeys: string[] = [];
        for (let applyRule of applyRules) {
            if (applyRule.constructor.name !== "Object" || Object.keys(applyRule).length !== 1) {
                throw new InsightError("APPLY should be object with have 1 key for each rule");
            }
            let key = Object.keys(applyRule)[0];
            let body = applyRule[key];
            if (body.constructor.name !== "Object") {
                throw new InsightError("APPLY body must be object");
            }
            if (key.length < 1) {
                throw new InsightError("APPLY key can not be empty");
            }
            if (key.includes("_")) {
                throw new InsightError("APPLY key can not include underscores");
            }
            if (Object.keys(body).length !== 1) {
                throw new InsightError(("APPLY body should only have one key"));
            }
            let token: string = Object.keys(body)[0];
            if (!this.validTokens.includes(token)) {
                throw new InsightError(("APPLY token invalid"));
            }
            let tokenKey: string = body[token];
            let underScorePos = tokenKey.indexOf("_");
            let idString = tokenKey.substring(0, underScorePos);
            let field = tokenKey.substring(underScorePos + 1, tokenKey.length);
            if (id) {
                id = idString;
            } else if (id !== idString) {
                throw new InsightError("Attempting to reference multiple datasets");
            }
            if (sFields.includes(field)) {
                if (!this.supportString.includes(token)) {
                    throw new InsightError("Invalid key in ApplyRule");
                }
            } else if (!mFields.includes(field)) {
                throw new InsightError("Invalid key in ApplyRule");
            }
            if (applyKeys.includes(key)) {
                throw new InsightError("APPLY key used more than once");
            }
            applyKeys.push(key);
        }
        return applyKeys;
    }
}
