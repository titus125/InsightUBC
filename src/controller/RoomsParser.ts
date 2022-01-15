import {InsightRoomsData} from "./IInsightFacade";

export default class RoomsParser {
    public parseHTML(html: string): Array<Promise<InsightRoomsData>> {
        const parse5 = require("parse5");
        let obj = parse5.parse(html);
        let buildingData = this.getBuildingInfo(obj);
        return this.getRooms(obj, buildingData);
    }

    private getBuildingInfo(parsedData: any) {
        let buildingInfoNode = this.findNodeWithAttribute(parsedData, "building-info");
        // the fullName is located at the first "h2" node
        let fullName = this.findNodeWithNodeName(buildingInfoNode, "h2")
            .childNodes[0].childNodes[0].value;
        let address;
        let firstDivNode;
        for (const child of buildingInfoNode.childNodes) {
            firstDivNode = this.findNodeWithNodeName(child, "div");
            if (firstDivNode) {
                break;
            }
        }
        address = firstDivNode.childNodes[0].childNodes[0].value;
        return [fullName, address];
    }

    private findNodeWithAttribute(node: any, attribute: string): any {
        if ((node.hasOwnProperty("attrs")) && (node.attrs.length > 0)
            && (node.attrs[0].hasOwnProperty("value")) && (node.attrs[0].value === attribute)) {
            return node;
        }
        if (node.hasOwnProperty("childNodes")) {
            for (const child of node.childNodes) {
                const res = this.findNodeWithAttribute(child, attribute);
                if (res) {
                    return res;
                }
            }
        }
        return null;
    }

    private findNodeWithNodeName(node: any, name: string): any {
        if ((node.hasOwnProperty("nodeName")) && (node.nodeName === name)) {
            return node;
        }
        if (node.hasOwnProperty("childNodes")) {
            for (const child of node.childNodes) {
                const res = this.findNodeWithNodeName(child, name);
                if (res) {
                    return res;
                }
            }
        }
        return null;
    }

    private getRooms(parsedHTML: any, buildingData: any[]) {
        let rooms: Array<Promise<InsightRoomsData>> = [];
        let tables = this.getAllTables(parsedHTML);
        let latLonPromise = this.getGeoLocation(buildingData[1]);
        for (let table of tables) {
            if (RoomsParser.isTableValid(table)) {
                for (const trNode of table.childNodes) {
                    if (trNode.hasOwnProperty("nodeName") && (trNode.nodeName === "tr")) {
                        rooms.push(this.extractRoom(trNode, buildingData, latLonPromise));
                    }
                }
                break;
            }
        }
        return rooms;
    }

    private static isTableValid(table: any) {
        for (const trNode of table.childNodes) {
            if (trNode.hasOwnProperty("nodeName") && (trNode.nodeName === "tr")) {
                return true;
            }
        }
        return false;
    }

    private getAllTables(node: any) {
        let tables = [];
        if ((node.hasOwnProperty("nodeName")) && (node.nodeName === "tbody")) {
            tables.push(node);
        }
        if (node.hasOwnProperty("childNodes")) {
            for (const child of node.childNodes) {
                const res = this.findNodeWithNodeName(child, "tbody");
                if (res) {
                    tables.push(res);
                }
            }
        }
        return tables;
    }

    private extractRoom(trNode: any, buildingData: any[], latLonPromise: Promise<any>): Promise<InsightRoomsData>  {
        return new Promise((fulfill) => {
            let roomsData: InsightRoomsData = {
                fullname: buildingData[0], shortname: "", number: "", name: "", address: buildingData[1],
                lat: 0, lon: 0, seats: 0, type: "", furniture: "", href: ""
            };
            let error: InsightRoomsData = {
                fullname: "", shortname: "", number: "", name: "", address: "", lat: -1,
                lon: -1, seats: -1, type: "", furniture: "", href: ""
            };
            for (const tdNode of trNode.childNodes) {
                if (tdNode.hasOwnProperty("nodeName") && (tdNode.nodeName === "td")) {
                    if (tdNode.hasOwnProperty("attrs")) {
                        if (tdNode.attrs[0].value === "views-field views-field-field-room-number") {
                            let a = this.findNodeWithNodeName(tdNode, "a");
                            roomsData["href"] = a.attrs[0].value;
                            let slashPos = roomsData["href"].lastIndexOf("/");
                            let name = roomsData["href"].substring(slashPos + 1);
                            let dashPos = name.indexOf("-");
                            name = name.replace("-", "_");
                            let shortName = name.substring(0, dashPos);
                            let roomNumber = name.substring(dashPos + 1);
                            roomsData["name"] = name;
                            roomsData["shortname"] = shortName;
                            roomsData["number"] = roomNumber;
                        } else if (tdNode.attrs[0].value === "views-field views-field-field-room-capacity") {
                            let capacity = tdNode.childNodes[0].value;
                            roomsData["seats"] = parseInt(capacity, 10);
                        } else if (tdNode.attrs[0].value === "views-field views-field-field-room-furniture") {
                            let furniture = tdNode.childNodes[0].value;
                            roomsData["furniture"] = furniture.trim();
                        } else if (tdNode.attrs[0].value === "views-field views-field-field-room-type") {
                            let type = tdNode.childNodes[0].value;
                            roomsData["type"] = type.trim();
                        }
                    }
                }
            }
            latLonPromise.then((latLon) => {
                if (latLon === "error") {
                    fulfill(error);
                } else {
                    roomsData["lat"] = latLon[0];
                    roomsData["lon"] = latLon[1];
                    fulfill(roomsData);
                }
            }).catch(() => fulfill(error));
        });
    }

    private getGeoLocation(address: string): Promise<any> {
        const http = require("http");
        let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team166" + "/" + encodeURI(address);
        return new Promise((fulfill) => {
            http.get(url, (message: any) => {
                if (message.statusCode === "404") {
                    fulfill("error");
                } else {
                    message.setEncoding("utf8");
                    message.on("data", (data: any) => {
                        let json = JSON.parse(data);
                        if (!json.hasOwnProperty("error")) {
                            let lat = json["lat"];
                            let lon = json["lon"];
                            fulfill([lat, lon]);
                        } else  {
                            fulfill("error");
                        }
                    });
                }
            });
        });
    }

    public verifyInHTML(buildingName: string, html: any): boolean {
        const parse5 = require("parse5");
        let parsedHTML = parse5.parse(html);
        let tbody = this.findNodeWithNodeName(parsedHTML, "tbody");
        let searchFor = "./campus/discover/buildings-and-classrooms/" + buildingName;
        let result = this.findNodeWithAttribute(tbody, searchFor);
        return result !== null;

    }
}
