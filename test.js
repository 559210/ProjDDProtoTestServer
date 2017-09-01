let a = [1,2,3,4,5];

function insertIntoArrayByTimestamp(arr, start, end, data) {
    if (start === end) {
        arr.splice(start, 0, data);
    }
    else {
        var half = start + ((end - start) >> 1);
        console.log("start: %j, end: %j, half: %j", start, end, half);
        if (arr[half] > data) {
            insertIntoArrayByTimestamp(arr, start, half, data);
        }
        else {
            insertIntoArrayByTimestamp(arr, half + 1, end, data);
        }
    }
}


insertIntoArrayByTimestamp(a, 0, a.length, 100);
console.log(a);
insertIntoArrayByTimestamp(a, 0, a.length, 50);
console.log(a);
insertIntoArrayByTimestamp(a, 0, a.length, 25);
console.log(a);
insertIntoArrayByTimestamp(a, 0, a.length, 12);
console.log(a);
insertIntoArrayByTimestamp(a, 0, a.length, 12);
console.log(a);
insertIntoArrayByTimestamp(a, 0, a.length, 3);
console.log(a);
insertIntoArrayByTimestamp(a, 0, a.length, -2);
console.log(a);