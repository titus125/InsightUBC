/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = (query) => {
    return new Promise(function(fulfill, reject) {
        try {
            let xhr = new XMLHttpRequest();

            xhr.open("POST", "/query", true);

            xhr.onload = function () {
                if (xhr.status === 200) {
                    fulfill(xhr.response);
                } else if (xhr.status === 400) {
                    fulfill(xhr.response);
                } else {
                    reject(xhr.response);
                }
            };
            xhr.send(JSON.stringify(query));
        } catch (e) {
            reject({ error: e });
        }
    });
};
