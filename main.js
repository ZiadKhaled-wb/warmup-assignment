const { time } = require("console");
const fs = require("fs");

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
    // 1. Convert the duration strings (like "9:30:00") into seconds
    // Note: We use durationToSeconds instead of timeToSeconds because there is no AM/PM here
    let shiftSec = durationToSeconds(shiftDuration);
    let idleSec = durationToSeconds(idleTime);
    
    // 2. Subtract the idle seconds from the total shift seconds
    let activeSec = shiftSec - idleSec;
    
    // 3. Convert the result back to a string format and return it
    return secondsToTime(activeSec);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // TODO: Implement this function
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // TODO: Implement this function
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
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
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
    // TODO: Implement this function
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
    // TODO: Implement this function
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
