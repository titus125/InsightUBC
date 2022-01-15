/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */

let id = "";
let doc = null;

CampusExplorer.buildQuery = () => {
    let query = {};
    doc = document.querySelector(document.querySelector('.active').getAttribute('href'));
    id = doc.querySelectorAll('form > div > div > div > select > option')[0].value === "audit" ? "courses" : "rooms";
    query["WHERE"] = buildWhere();
    query["OPTIONS"] = buildOptions();
    if (hasTransformations()) {
        query["TRANSFORMATIONS"] = buildTransformations();
    }
    return query;
};

function buildWhere() {
    let where = {};
    let conditions = doc.querySelectorAll('form > div > div.conditions-container > div');
    if (conditions.length === 1) {
        if (doc.querySelector('[class~=condition-type] > div > [value = none]').checked) {
            where["NOT"] = buildFilters(conditions);
        } else {
            where = buildFilters(conditions)
        }
    } else if (conditions.length > 1) {
        if (doc.querySelector('[class~=condition-type] > div > [value = all]').checked) {
            where["AND"] = buildFilters(conditions);
        } else if (doc.querySelector('[class~=condition-type] > div > [value = any]').checked) {
            where["OR"] = buildFilters(conditions);
        } else {
            where["NOT"] = getKeyVal("OR", buildFilters(conditions));
        }
    }
    return where;
}

function buildFilters(conditions) {
    let filters = [];
    for (let cond of conditions) {
        let filter = buildFilter(cond);
        filters.push(filter);
    }
    return filters.length === 1 ? filters[0] : filters;
}

function buildFilter(cond) {
    let filter = {}
    let operator = cond.querySelector("[class~=operators] > select > [selected=selected]").getAttribute("value");
    let key = id + "_" + cond.querySelector("[class~=fields] > select > [selected=selected]").getAttribute("value");
    let val = cond.querySelector("[class~=term] > input").getAttribute("value");
    filter[operator] = (operator === "IS") || Number.isNaN(parseFloat(val)) ? getKeyVal(key, val) : getKeyVal(key, parseFloat(val));
    return (cond.querySelector("[type=checkbox]").checked) ? { "NOT" : filter } : filter;
}

function buildOptions() {
    let options = {};
    options["COLUMNS"] = buildColumns();
    let selectedKeys = doc.querySelectorAll('form > div > div > div > select > [selected=selected]');
    let down = doc.querySelector('.descending > input').checked;
    if (selectedKeys.length === 1 && !down) {
        options["ORDER"] = selectedKeys[0].getAttribute("class") === "transformation" ?
            selectedKeys[0].getAttribute("value") :
            id + "_" + selectedKeys[0].getAttribute("value");
    } else if (selectedKeys.length > 0) {
        options["ORDER"] = buildOrder(selectedKeys, down);
    }
    return options;
}

function buildColumns() {
    let columns = [];
    let fields = doc.querySelectorAll('form > .columns > .control-group > div > [checked=checked]');
    for (let field of fields) {
        let col = field.getAttribute("value")
        if (field.getAttribute("id") !== null) {
            col = id + "_" + col;
        }
        columns.push(col)
    }
    return columns;
}

function buildOrder(selectedKeys, down) {
    let order = {};
    let keys = [];
    order["dir"] = down ? "DOWN" : "UP";
    for (let key of selectedKeys) {
        let orderKey = key.getAttribute("class") === "transformation" ?
            key.getAttribute("value") :
            id + "_" + key.getAttribute("value");
        keys.push(orderKey);
    }
    order["keys"] = keys;
    return order;
}

function hasTransformations() {
    return doc.querySelectorAll('.groups > div > div.field [checked=checked]').length > 0 ||
        doc.querySelector('.transformations-container').childElementCount > 0;
}

function buildTransformations() {
    let transformations = {};
    transformations["GROUP"] = buildGroup();
    transformations["APPLY"] = buildApply();
    return transformations;
}

function buildGroup() {
    let group = [];
    let groupKeys = doc.querySelectorAll('.groups > div > div.field [checked=checked]');
    for (let key of groupKeys) {
        group.push(id + "_" + key.getAttribute("value"));
    }
    return group;
}

function buildApply() {
    let applyRules = [];
    for (let apply of doc.querySelector('.transformations-container').children) {
        let rule = {}
        rule[apply.querySelector('.term > input').getAttribute("value")] =
            getKeyVal(apply.querySelector('.operators > select > [selected=selected]').getAttribute("value"),
                id + "_" + apply.querySelector('.fields > select > [selected=selected]').getAttribute("value"));
        applyRules.push(rule);
    }
    return applyRules;
}

function getKeyVal(key, val) {
    let keyVal = {}
    if (val === null || val === undefined) {
        val = "";
    }
    keyVal[key] = val;
    return keyVal;
}
