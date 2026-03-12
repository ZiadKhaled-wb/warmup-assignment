const fs = require("fs");
const { text } = require("stream/consumers");

// Some Helper Functions to Help:

// Helper 1: Converts time like "7:30:00 am" to total seconds
function timeToSeconds (timeStr) {
    let parts = timeStr.split(" "); // Splits "7:30:00" and "am" into an array
    let time = parts[0];
    let modifer = parts[1];

    let timeParts = time.split(":");
    let hours = parseInt(timeParts[0]);
    let minutes = parseInt(timeParts[1]);
    let seconds = parseInt(timeParts[2]);

    if (hours === 12) {
        hours = 0;
    }
    if (modifer.toLowerCase() === "pm") {
        hours = hours + 12;
    }

    // Convert everything into total seconds and return it
    return (hours * 3600) + (minutes * 60) + seconds;
}

// Helper 2: Converts duration like "7:30:00" without "am" or "pm" to total seconds

function durationToSeconds (durStr) {
    let parts = durStr.split(":");
    return (parseInt(parts[0]) * 3600) + (parseInt(parts[1]) * 60) + (parseInt(parts[2]));
}

// Helper 3: Converts total seconds back to a string like "h:mm:ss"

function secondsToTime (totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds = totalSeconds % 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    // If minutes or seconds are single digits, add a leading "0" (e.g., "5" becomes "05")
    let minStr = minutes < 10 ? "0" + minutes : minutes;
    let secStr = seconds < 10 ? "0" + seconds : seconds;

    return hours + ":" + minStr + ":" + secStr;
} 
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);
    // If the endTime is numerically less than the start time that means that the shift went passed midnight into the next day!
    if (endSec < startSec) {
        endSec = endSec + (24 * 3600);
    }
    // Subtract start time from end to get the total shift duration in seconds.
    let durationSec = endSec - startSec;
    // Converts those total seconds back into readable string and return it
    return secondsToTime(durationSec);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    // 1. Convert times to seconds and handle overnight shifts (same as function 1)
    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);

    if (endSec < startSec) {
        endSec = endSec + (24 * 3600);
    }
    // 2. Calculate the entire shift duration 
    let totalDuration = endSec - startSec;

    // 3. Define the active window boundaries in seconds.
    let activeStart1 = 8 * 3600;
    let activeEnd1 = 22 * 3600;

    // 4. Define tomorrow's active window (just in case the shift goes overnight into the next day)
    let activeStart2 = activeStart1 + (24 * 3600); 
    let activeEnd2 = activeEnd1 + (24 * 3600);

    // 5. Find how much of the shift overlaps with Today's active window
    // Math.max finds the later start time. Math.min finds the earlier end time.
    let overlapStart1 = Math.max(startSec, activeStart1);
    let overlapEnd1 = Math.min(endSec, activeEnd1);
    // If the overlap ends before it starts, it means 0 overlap (hence Math.max(0, ...))
    let activeSec1 = Math.max(0, overlapEnd1 - overlapStart1);
    
    // 6. Find how much of the shift overlaps with Tomorrow's active window
    let overlapStart2 = Math.max(startSec, activeStart2);
    let overlapEnd2 = Math.min(endSec, activeEnd2);
    let activeSec2 = Math.max(0, overlapEnd2 - overlapStart2);
    
    // 7. Add today's active time and tomorrow's active time together
    let totalActiveSec = activeSec1 + activeSec2;
    
    // 8. Subtract the active time from the total time to get the idle time
    let idleSec = totalDuration - totalActiveSec;

    // 9. Return the idle time formatted as "h:mm:ss"
    return secondsToTime(idleSec);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    let shiftSec = durationToSeconds(shiftDuration);
    let idleSec = durationToSeconds(idleTime);
    let activeSec = shiftSec - idleSec;
    return secondsToTime(activeSec);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let activeSec = durationToSeconds(activeTime);
    let normalQuotaSec = (8 * 3600) + (24 * 60);
    let eidQuotaSec = 6 * 3600;
    if (date >= "2025-04-10" && date <= "2025-04-30") {
        return activeSec >= eidQuotaSec;
    }
    else {
        return activeSec >= normalQuotaSec;
    }
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let isQuotaMet = metQuota(shiftObj.date, activeTime);
    let hasBouns = false; // By default as it is a new shift
    let fileContent = fs.readFileSync(textFile, {encoding: "utf8"}).trim();
    let lines = fileContent.split("\n");
    for (let i = 1; i < lines.length; i++) {
        let columns = lines[i].split(",");
        let existingDriverID = columns[0];
        let existingDate = columns[2];
        if (existingDriverID === shiftObj.driverID && existingDate === shiftObj.date) {
            return {} // The Shift Object already exists
        }
    }
    let fullRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: isQuotaMet, 
        hasBonus: hasBouns
    }
    let newLine = `${fullRecord.driverID},${fullRecord.driverName},${fullRecord.date},${fullRecord.startTime},${fullRecord.endTime},${fullRecord.shiftDuration},${fullRecord.idleTime},${fullRecord.activeTime},${fullRecord.metQuota},${fullRecord.hasBonus}`;
    let header = lines[0];
    let dataRecords = lines.slice(1);
    dataRecords.push(newLine);
    dataRecords.sort((a, b) => {
        let colsA = a.split(",");
        let colsB = b.split(",");
        if (colsA[0] !== colsB[0]) {
            return colsA[0].localeCompare(colsB[0]); // Sort by Driver ID
        }
        else {
            return colsA[2].localeCompare(colsB[2]); // If IDs are the same sort by Dates
        }
    });
    let updatedFileContent = [header, ...dataRecords].join("\n");
    fs.writeFileSync(textFile, updatedFileContent, {encoding: "utf8"});
    return fullRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let fileContent = fs.readFileSync(textFile, {encoding: "utf8"}).trim();
    let lines = fileContent.split("\n");
    for (let i = 1; i < lines.length; i++) {
        let columns = lines[i].split(",");
        let currentDriverID = columns[0];
        let currentDate = columns[2];
        if (currentDriverID === driverID && currentDate == date) {
            columns[9] = newValue;
            lines[i] = columns.join(",");
            break;
        }
    }
    let updatedFileContent = lines.join("\n");
    fs.writeFileSync(textFile, updatedFileContent, {encoding: "utf8"});
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let fileContent = fs.readFileSync(textFile, {encoding: "utf8"}).trim();
    let lines = fileContent.split("\n");
    let dirverExists = false;
    let bonusCount = 0;
    let targetMonth = parseInt(month);
    for (let i = 1; i < lines.length; i++) {
        let columns = lines[i].split(",");
        let currentDriverID = columns[0];
        
        if (currentDriverID === driverID) {
            dirverExists = true;
            let dateStr = columns[2];
            let dateParts = dateStr.split("-")
            let currentMonth = parseInt(dateParts[1]);
            let hasBonus = columns[9].trim();
            if (currentMonth === targetMonth && hasBonus === "true") {
                bonusCount = bonusCount + 1;
            }
        }
    }
    if (!dirverExists) {
        return -1;
    }
    return bonusCount;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let fileContent = fs.readFileSync(textFile, {encoding: "utf8"}).trim();
    let lines = fileContent.split("\n");
    let totalSeconds = 0;
    let targetMonth = parseInt(month);

    for (let i = 1; i < lines.length; i++) {
        let columns = lines[i].split(",");
        let currentDriverID = columns[0];
        if (currentDriverID === driverID) {
            let dateStr = columns[2];
            let dateParts = dateStr.split("-");
            let currentMonth = parseInt(dateParts[1]);
            
            if (currentMonth === targetMonth) {
                let activeTimeStr = columns[7];

                totalSeconds += durationToSeconds(activeTimeStr);
            }
        }
    }
    return secondsToTime(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    let ratesContent = fs.readFileSync(rateFile, {encoding: "utf8"}).trim();
    let ratesLines = ratesContent.split("\n");

    let dayOffStr = "";

    for (let i = 0; i < ratesLines.length; i++) {
        let columns = ratesLines[i].split(",");
        if (columns[0] === driverID) {
            dayOffStr = columns[1].trim();
            break;
        }
    }
    let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let dayOfIndex = daysOfWeek.indexOf(dayOffStr);

    let shiftContent = fs.readFileSync(textFile, {encoding: "utf8"}).trim();
    let shiftLines = shiftContent.split("\n");

    let totalRequiredSec = 0;
    let targetMonth = parseInt(month);

    for (let i = 1; i < shiftLines.length; i++) {
        let columns = shiftLines[i].split(",");
        if (columns[0] === driverID) {
            let dateStr = columns[2];
            let dateParts = dateStr.split("-");
            let currentMonth = parseInt(dateParts[1]);

            if (currentMonth === targetMonth) {
                let year = parseInt(dateParts[0]);
                let day = parseInt(dateParts[2]);

                let shiftObj = new Date(year, currentMonth - 1, day);

                if (shiftObj.getDay() !== dayOfIndex) {
                    if (dateStr >= "2025-04-10" && dateStr <= "2025-04-30") {
                        totalRequiredSec += (6 * 3600);
                    }
                    else {
                        totalRequiredSec += (8 * 3600) + (24 * 60);
                    }
                }
            }
        }
    }
    let bonusDeductionSec = bonusCount * 2 * 3600;
    totalRequiredSec -= bonusDeductionSec;

    if (totalRequiredSec < 0) {
        totalRequiredSec = 0;
    }

    return secondsToTime(totalRequiredSec);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let actualSec = durationToSeconds(actualHours);
    let requiredSec = durationToSeconds(requiredHours);
    let missingSec = requiredSec - actualSec;
    let missingHours = 0;

    if (missingSec > 0) {
        missingHours = Math.floor(missingSec / 3600);
    }

    let ratesContent = fs.readFileSync(rateFile, {encoding: "utf8"}).trim();
    let ratesLines = ratesContent.split("\n");

    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < ratesLines.length; i++) {
        let columns = ratesLines[i].split(",");
        if (columns[0] === driverID) {
            basePay = parseInt(columns[2]);
            tier = parseInt(columns[3]);
            break;
        }
    }
    let allowedMissingHours = 0;
    switch (tier) {
        case 1: allowedMissingHours = 50;
        break;
        case 2: allowedMissingHours = 20;
        break;
        case 3: allowedMissingHours = 10;
        break;
        case 4: allowedMissingHours = 3;
        break;
        default: allowedMissingHours = 0;
    }

    let hoursToDeduct = missingHours - allowedMissingHours;
    if (hoursToDeduct < 0) {
        hoursToDeduct = 0;
    }
    let deductionRatePerHour = Math.floor(basePay/185);
    let salaryDeduction = hoursToDeduct * deductionRatePerHour;
    let netPay = basePay - salaryDeduction;

    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
