/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    private static insightFacade: InsightFacade;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
        Server.insightFacade = new InsightFacade();
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        // const id: string = "courses";
        // let content = fs.readFileSync("./test/data/courses.zip").toString("base64");
        // Server.insightFacade.addDataset(
        //     id,
        //     content,
        //     InsightDatasetKind.Courses,
        // );
        // const id2: string = "rooms";
        // let content2 = fs.readFileSync("./test/data/rooms.zip").toString("base64");
        // Server.insightFacade.addDataset(
        //     id2,
        //     content2,
        //     InsightDatasetKind.Rooms,
        // );
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);

                // NOTE: your endpoints should go here
                that.rest.put("/dataset/:id/:kind", Server.putDataset);
                that.rest.del("/dataset/:id", Server.deleteDataset);
                that.rest.post("/query", Server.postQuery);
                that.rest.get("/datasets", Server.listDatasets);

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding" + 400);
            res.json(400, {error: err});
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    private static async putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::put(..) - id: " + JSON.stringify(req.params.id));
        const id = req.params.id;
        const kind = req.params.kind;
        let content;
        try {
            content = Buffer.from(req.body).toString("base64");
        } catch (e) {
            Log.error("Server::put(..) - responding " + 400);
            res.send(400, {error: e.message});
            return next();
        }
        Server.insightFacade.addDataset(id, content, kind).then((ids: string[]) => {
            Log.info("Server::put(..) - responding " + 200);
            res.send(200, {result: ids});
            return next();
        }).catch((e) => {
            Log.error("Server::put(..) - responding " + 400);
            res.send(400, {error: e.message});
            return next();
        });
    }

    private static async deleteDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::del(..) - id: " + JSON.stringify(req.params.id));
        Server.insightFacade.removeDataset(req.params.id).then((id: string) => {
            Log.info("Server::del(..) - responding " + 200);
            res.send(200, {result: id});
            return next();
        }).catch((e) => {
            if (e instanceof InsightError) {
                Log.error("Server::del(..) - responding " + 400);
                res.send(400, {error: e.message});
            } else {
                Log.error("Server::del(..) - responding " + 404);
                res.send(404, {error: e.message});
            }
            return next();
        });
    }

    private static async postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::post(..) - url: ", req.url);
        let query = req.body;
        if (query.constructor.name !== "Object") {
            query = JSON.parse(query);
        }
        Server.insightFacade.performQuery(query).then((data: any[]) => {
            Log.info("Server::post(..) - responding " + 200);
            res.send(200, {result: data});
            return next();
        }).catch((e) => {
            Log.error("Server::post(..) - responding " + 400);
            res.send(400, {error: e.message});
            return next();
        });
    }

    private static async listDatasets(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::get(..) - url: ", req.url);
        Server.insightFacade.listDatasets().then((datasets) => {
            Log.info("Server::del(..) - responding " + 200);
            res.send(200, {result: datasets});
            return next();
        });
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

}
