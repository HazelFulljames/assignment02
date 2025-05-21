console.log("loaded")

// Get all pearls
const response = await fetch(`/route/getPearls`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
});
const ref = await response.json();
// Loop through it and add value to object [{username, pearlCount}]
var pearlsArray = [];
if (response.ok) {
    console.log(ref.pearls, ref.pearls.length)
    for (let i = 0; i < ref.pearls.length; i++) {
        console.log(ref.pearls[i])
        let exists = false;
        for (let j = 0; j < pearlsArray.length; j++) {
            if (pearlsArray[j].username == ref.pearls[i].addedBy) {
                exists = true;
                pearlsArray[j].pearlCount++;
            }
        }
        if (!exists) {
            pearlsArray.push({username: ref.pearls[i].addedBy, pearlCount: 1})
        }
    }
}
// Sort it
let unsorted = true;
// While unsorted
while (unsorted) {
    unsorted = false;
    // Loop through array
    for (let i = 0; i < pearlsArray.length - 1; i++) {
        // If pearlsCount < array+1.pearlsCount
        if (pearlsArray[i].pearlCount < pearlsArray[i+1].pearlCount) {
            unsorted = true;
            // Swap
            let temp = pearlsArray[i];
            pearlsArray[i] = pearlsArray[i+1];
            pearlsArray[i+1] = temp;
        }
    }
}
console.log(pearlsArray)
// Show as a table
let html = "<table><tr><th>Place</th><th>User</th><th>Pearls</th></tr>";
for (let i = 0; i < pearlsArray.length; i++) {
    html += `<tr><td>${i+1}</td><td>${pearlsArray[i].username}</td><td>${pearlsArray[i].pearlCount}</td></tr>`;
}
html += "</table>";
document.getElementById("pearlCount").innerHTML = html;