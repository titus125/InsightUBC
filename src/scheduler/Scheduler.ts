import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";

export default class Scheduler implements IScheduler {
    private allTimetables: Array<{[key: string]: {[key: string]: SchedSection}}> = [];
    private timeSlots = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100" , "MWF 1100-1200",
        "MWF 1200-1300", "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700",
        "TR  0800-0930", "TR  0930-1100", "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];

    private totalEnrollment: number;
    private buildingsDistanceDict: Array<Array<{[key: string]: number}>> = [];
    private roomsDict: {[roomName: string]: SchedRoom} = {};
    private buildingsDict: {[buildingName: string]: SchedRoom[]} = {};
    private coursesDict: Array<{[course: string]: string[]}> = [];

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let ret: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        if (sections.length === 0 || rooms.length === 0) {
            return ret;
        }
        let sortedSections = this.sortSections(sections);
        this.totalEnrollment = Scheduler.getTotalEnrollment(sections);
        let allSortedRooms: SchedRoom[][] = [];
        this.groupRooms(rooms);
        rooms.forEach((room) => {
            this.roomsDict[room.rooms_shortname + "_" + room.rooms_number] = room;
        });
        Object.values(this.buildingsDict).forEach((roomArr) => {
            allSortedRooms.push(this.sortRoomsByStart(roomArr[0], rooms));
        });
        // intervals determines how optimal u want to be, interval = 1 is most optimal
        let interval = 16;
        for (let i = 0; i < allSortedRooms.length; i += interval) {
            this.coursesDict[i] = {};
            this.allTimetables[i] = this.setUpTimeTable(allSortedRooms[i]);
            sortedSections.forEach((section) => {
                this.allTimetables[i] = this.scheduleSection(this.allTimetables[i],
                    section, allSortedRooms[i], i);
            });
            this.allTimetables[i] = this.deleteExcessKeysInTimeTable(this.allTimetables[i]);
            this.allTimetables[i] = this.optimizeScore(this.allTimetables[i], this.buildingsDistanceDict[i]);
        }
        let bestTimeTable = this.findBestTimetable(interval);
        ret = this.convertToOutput(bestTimeTable);
        return ret;
    }

    // finds a valid timeSlot for the given section. Tries to put the section in the closest building first
    private scheduleSection(timetable: {[key: string]: {[key: string]: SchedSection}},
                            section: SchedSection, sortedRooms: SchedRoom[], index: number) {
        let newTimetable = JSON.parse(JSON.stringify(timetable));
        let coursesDict: {[course: string]: string[]} = {};
        try {
            sortedRooms.forEach((room) => {
                // Check whether the room is big enough for section
                if (Scheduler.isValidRoomForSection(room, section)) {
                    Object.keys(newTimetable[room.rooms_shortname + "_" + room.rooms_number])
                        .forEach((timeslot) => {
                        let timeSlotOpen =
                            newTimetable[room.rooms_shortname + "_" + room.rooms_number][timeslot] === null;
                        if (timeSlotOpen && (Scheduler.noSectionsUsedSlotAlready(this.coursesDict[index]
                            , timeslot, section))) {
                            newTimetable[room.rooms_shortname + "_" + room.rooms_number][timeslot] = section;
                            let courseSection = section.courses_dept + section.courses_id;
                            if (this.coursesDict[index].hasOwnProperty(courseSection)) {
                                this.coursesDict[index][courseSection].push(timeslot);
                            } else {
                                this.coursesDict[index][courseSection] = [timeslot];
                            }
                            throw newTimetable;
                        }
                    });
                }
            });
            this.coursesDict.push(coursesDict);
            return newTimetable;
        } catch (e) {
            this.coursesDict.push(coursesDict);
            return e;
        }
    }

    // Return a sorted array of sections. Given a starting section, we add a new section which minimizes the maximum
    // distance between the sorted set of sections (or buildings equivalently) until we exhaust all sections
    private sortRoomsByStart(start: SchedRoom, rooms: SchedRoom[]) {
        // first we create a set of buildings, each building has a value corresponding to the
        // all sections in the building
        let buildings = JSON.parse(JSON.stringify(this.buildingsDict));
        delete buildings[start.rooms_shortname];
        let ret = this.buildingsDict[start.rooms_shortname];
        let distances: Array<{[key: string]: number}> = [];
        let startDistance: {[key: string]: number} = {};
        startDistance[start.rooms_shortname] = 0;
        distances.push(startDistance);

        function findNextBuildingToAdd(retArr: SchedRoom[], buildingsLeftToSort: { [p: string]: SchedRoom[] }) {
            // We want the minimum of the maximum of the building in buildingsLeftToSort among retArr
            let minBuilding = Object.values(buildingsLeftToSort)[0];
            let minValue = 99999;
            Object.values(buildingsLeftToSort).forEach((room) => {
                let max = 0;
                retArr.forEach((roomInRet) => {
                    max = Math.max(Scheduler.getDistance(room[0].rooms_lat, room[0].rooms_lon,
                        roomInRet.rooms_lat, roomInRet.rooms_lon), max);
                });
                if (max <= minValue) {
                    minBuilding = room;
                    minValue = max;
                }
            });
            return {building: minBuilding, value: minValue};
        }

        while (Object.keys(buildings).length !== 0) {
            let buildingToAdd = findNextBuildingToAdd(ret, buildings);
            ret = ret.concat(buildingToAdd["building"]);
            delete buildings[buildingToAdd["building"][0].rooms_shortname];
            let buildingName: string = buildingToAdd["building"][0].rooms_shortname;
            let newBuilding: {[key: string]: number} = {};
            newBuilding[buildingName] = buildingToAdd["value"];
            distances.push(newBuilding);
        }
        this.buildingsDistanceDict.push(distances);
        return ret;
    }

    private getScoreOfTimeTable(timetable: {[key: string]: {[key: string]: SchedSection}},
                                distancesInSortedRooms: Array<{ [key: string]: number}>) {
        let maxDistance = 0;
        let tempDict: {[key: string]: number} = {};
        distancesInSortedRooms.forEach((building) => {
            tempDict[Object.keys(building)[0]] = Object.values(building)[0];
        });
        Object.keys(timetable).forEach((room) => {
            let roomData = this.roomsDict[room];
            let distance = tempDict[roomData.rooms_shortname];
            if (distance > maxDistance) {
                maxDistance = distance;
            }
        });
        let D = maxDistance / 1372;
        let scheduledEnrollment = 0;
        Object.values(timetable).forEach((timeSlots) => {
            Object.values(timeSlots).forEach((section) => {
                scheduledEnrollment += Scheduler.getSectionEnrollment(section);
            });
        });
        let E = scheduledEnrollment / this.totalEnrollment;
        let score = 0.7 * E + 0.3 * (1 - D);
        return score;
    }


    private sortSections(sections: SchedSection[]) {
        let sortedSections = sections;
        sortedSections.sort((section1, section2) =>
           Scheduler.getSectionEnrollment(section2) - Scheduler.getSectionEnrollment(section1));
        return sortedSections;
    }

    private setUpTimeTable(rooms: SchedRoom[]) {
        let timetable: {[key: string]: {[key: string]: SchedSection}} = {};
        rooms.forEach((room) => {
            timetable[room.rooms_shortname + "_" + room.rooms_number] = {};
            this.timeSlots.forEach((timeslot) => {
                timetable[room.rooms_shortname + "_" + room.rooms_number][timeslot] = null;
            });
        });
        return timetable;
    }

    private deleteExcessKeysInTimeTable(timetable: {[key: string]: {[key: string]: SchedSection}}) {
        let newTimetable = JSON.parse(JSON.stringify(timetable));
        Object.keys(newTimetable).forEach((buildingName) => {
            let allEmpty = true;
            Object.keys(newTimetable[buildingName]).forEach((timeSlot) => {
                if (newTimetable[buildingName][timeSlot] !== null) {
                    allEmpty = false;
                } else {
                    delete newTimetable[buildingName][timeSlot];
                }
            });
            if (allEmpty) {
                delete newTimetable[buildingName];
            }
        });
        return newTimetable;
    }

    private static isValidRoomForSection(room: SchedRoom, section: SchedSection) {
        return room.rooms_seats >= Scheduler.getSectionEnrollment(section);
    }

    // The idea is to delete the furthest buildings in the timetable until the score stops increasing
    private optimizeScore(timetable: { [p: string]: { [p: string]: SchedSection } },
                          distancesInSortedRooms: Array<{ [key: string]: number}>) {
        let ret = JSON.parse(JSON.stringify(timetable));
        for (let i = distancesInSortedRooms.length - 1; i >= 1; i--) {
            let lastBuilding = Object.keys(distancesInSortedRooms[i])[0];
            let newTimeTable = JSON.parse(JSON.stringify(ret));
            Object.keys(timetable).forEach((room) => {
                if (room.includes(lastBuilding)) {
                    delete newTimeTable[room];
                }
            });
            let oldTimetableScore = this.getScoreOfTimeTable(ret, distancesInSortedRooms);
            let newTimetableScore = this.getScoreOfTimeTable(newTimeTable, distancesInSortedRooms);
            if (newTimetableScore > oldTimetableScore) {
                ret = JSON.parse(JSON.stringify(newTimeTable));
            } else {
                return ret;
            }
        }
        return ret;
    }

    private static getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        if (lat1 === lat2 && lon1 === lon2) {
            return 0;
        }
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c; // in metres
        return d;
    }

    private static getSectionEnrollment(section: SchedSection) {
        return section.courses_audit + section.courses_pass + section.courses_fail;
    }

    private static getTotalEnrollment(sections: SchedSection[]) {
        let total = 0;
        sections.forEach((section) => {
            total += this.getSectionEnrollment(section);
        });
        return total;
    }

    private findBestTimetable(ha: number) {
        let best = this.allTimetables[0];
        let bestScore = this.getScoreOfTimeTable(best, this.buildingsDistanceDict[0]);
        for (let i = 0; i < this.allTimetables.length; i += ha) {
            let score = this.getScoreOfTimeTable(this.allTimetables[i], this.buildingsDistanceDict[i]);
            if (score > bestScore) {
                best = this.allTimetables[i];
                bestScore = score;
            }
        }
        return best;
    }

    private convertToOutput(timetable: { [p: string]: { [p: string]: SchedSection } }) {
       let ret: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
       Object.keys(timetable).forEach((room) => {
           Object.keys(timetable[room]).forEach((timeSlot) => {
               ret.push([this.roomsDict[room], timetable[room][timeSlot], Scheduler.convertToTimeSlot(timeSlot)]);
           });
       });
       return ret;
    }

    private groupRooms(rooms: SchedRoom[]) {
        rooms.forEach((room) => {
            let buildingName: string = room.rooms_shortname;
            if (!this.buildingsDict.hasOwnProperty(buildingName)) {
                this.buildingsDict[buildingName] = [room];
            } else {
                this.buildingsDict[buildingName].push(room);
            }
        });
    }

    private static convertToTimeSlot(timeSlot: string): TimeSlot {
        return timeSlot as "MWF 0800-0900" | "MWF 0900-1000" | "MWF 1000-1100" | "MWF 1100-1200"
            | "MWF 1200-1300" | "MWF 1300-1400" | "MWF 1400-1500" | "MWF 1500-1600"
            | "MWF 1600-1700" | "TR  0800-0930" | "TR  0930-1100" | "TR  1100-1230"
            | "TR  1230-1400" | "TR  1400-1530" | "TR  1530-1700";
    }

    private static noSectionsUsedSlotAlready(coursesDict: { [p: string]: string[] },
                                             timeSlot: string, section: SchedSection) {
        if (coursesDict.hasOwnProperty(section.courses_dept + section.courses_id)) {
            return !coursesDict[section.courses_dept + section.courses_id].includes(timeSlot);
        } else {
            return true;
        }
    }
}
