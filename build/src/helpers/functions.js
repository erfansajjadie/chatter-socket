"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileUrl = getFileUrl;
exports.getAvatarUrl = getAvatarUrl;
exports.getTimeFormat = getTimeFormat;
function getFileUrl(url) {
    if (!url) {
        return null;
    }
    return `${process.env.CDN_HOST}/${url}`;
}
function getAvatarUrl(url) {
    if (!url) {
        return null;
    }
    return `https://synapsetech.ir/storage/${url}`;
}
function getTimeFormat(inputDate) {
    const today = new Date();
    if (isSameDay(inputDate, today)) {
        // Date is today, show only the time
        return inputDate.toLocaleTimeString("fa-IR-u-nu-latn", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    else if (isWithinThisWeek(inputDate, today)) {
        // Date is within this week, show the day of the week
        return inputDate.toLocaleDateString("fa-IR-u-nu-latn", { weekday: "long" });
    }
    else if (isSameMonth(inputDate, today)) {
        // Date is within this month, show month and day
        return inputDate.toLocaleDateString("fa-IR-u-nu-latn", {
            month: "long",
            day: "numeric",
        });
    }
    else {
        // Date is not within this month, show in yyyy-mm-dd format
        return inputDate.toLocaleDateString("fa-IR-u-nu-latn", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    }
}
function isSameDay(date1, date2) {
    return (date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear());
}
function isSameMonth(date1, date2) {
    return (date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear());
}
function isWithinThisWeek(date1, date2) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const dayDifference = Math.abs(Math.floor((date1 - date2) / millisecondsPerDay));
    return dayDifference < 7;
}
