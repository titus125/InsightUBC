import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import * as fs from "fs";

describe("Facade D3 rooms", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    const cacheDir = __dirname + "/../data";

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        server.start();
    });

    after(function () {
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    it("PUT rooms test", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/roomsInvalidURLWithOtherCourses/rooms";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/roomsInvalidURLWithOtherCourses.zip");
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("PUT test rooms existing dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/roomsInvalidURLWithOtherCourses/rooms";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/roomsInvalidURLWithOtherCourses.zip");
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect.fail(res.status.toString());
                })
                .catch(function (err) {
                    // some logging here please!
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });
    it("PUT rooms test add a second dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/rooms/rooms";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/rooms.zip");
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("Delete one rooms dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/roomsInvalidURLWithOtherCourses";
            return chai.request(SERVER_URL)
                .del(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("Delete non-existing rooms dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/roomsInvalidURLWithOtherCourses";
            return chai.request(SERVER_URL)
                .del(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect.fail(res.status.toString());
                })
                .catch(function (err) {
                    // some logging here please!
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("PUT rooms invalid test", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/NoRooms/rooms";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/NoRooms.zip");
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect.fail(res.status.toString());
                })
                .catch(function (err) {
                    // some logging here please!
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("Get list of rooms datasets test", async function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/datasets";
            return chai.request(SERVER_URL)
                .get(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});

describe("Facade D3 courses", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    const cacheDir = __dirname + "/../data";

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        server.start();
    });

    after(function () {
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    // Sample on how to format PUT requests

    it("PUT test", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/sample1/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/sample1.zip");
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("PUT test existing dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/sample1/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/sample1.zip");
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect.fail(res.status.toString());
                })
                .catch(function (err) {
                    // some logging here please!
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("PUT test add a second dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/courses/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/courses.zip");
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("Delete one dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/sample1";
            return chai.request(SERVER_URL)
                .del(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("Delete non-existing dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/sample1";
            return chai.request(SERVER_URL)
                .del(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect.fail(res.status.toString());
                })
                .catch(function (err) {
                    // some logging here please!
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });
    it("Delete invalid dataset", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/sample_1";
            return chai.request(SERVER_URL)
                .del(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect.fail(res.status.toString());
                })
                .catch(function (err) {
                    // some logging here please!
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });
    it("PUT invalid test", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/invalidHTML/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/invalidHTML.zip");
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect.fail(res.status.toString());
                })
                .catch(function (err) {
                    // some logging here please!
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });
    it("Put multiple test output", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/sample1/courses";
            let ZIP_FILE_DATA = fs.readFileSync("./test/data/sample1.zip");
            chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
            ENDPOINT_URL = "/dataset/sample2/courses";
            ZIP_FILE_DATA = fs.readFileSync("./test/data/sample2.zip");
            chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
            ENDPOINT_URL = "/dataset/sample3/courses";
            ZIP_FILE_DATA = fs.readFileSync("./test/data/sample3.zip");
            let datasetIds = ["courses", "sample1", "sample2", "sample3"];
            chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                    expect(res.body).to.be.equal(datasetIds);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail(err);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("PUT empty body", function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/dataset/courses/courses";
            let ZIP_FILE_DATA = "";
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            expect.fail(err);
        }
    });

    it("POST test", async function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/query";
            let query = JSON.parse(fs.readFileSync("./test/queries/logicComparison/singleAND.json").toString()).query;
            return chai.request(SERVER_URL)
                .post(ENDPOINT_URL)
                .send(query)
                .then(function (response: Response) {
                    expect(response.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    it("Get list of datasets test", async function () {
        try {
            let SERVER_URL = "http://localhost:4321";
            let ENDPOINT_URL = "/datasets";
            return chai.request(SERVER_URL)
                .get(ENDPOINT_URL)
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                });
        } catch (err) {
            // and some more logging here!
        }
    });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
