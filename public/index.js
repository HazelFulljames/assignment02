// Heatmap setup
var cfg = {
    container: document.getElementById('heatmapContainer'),
    // radius should be small ONLY if scaleRadius is true (or small radius is intended)
    // if scaleRadius is false it will be the constant radius used in pixels
    maxOpacity: .6,
    radius: 50,
    blur: .90,
    // backgroundColor with alpha so you can see through it
    backgroundColor: 'rgba(0, 0, 58, 0.96)'
};
var heatmap = new h337.create(cfg);
heatmap.setDataMax(320);
heatmap.setDataMin(0);

// Make pearls array, setup heatmap
// Get id of class variable
let pearlsString = document.getElementsByClassName("variable")[0].id;
// Remake an array out of it
let pearls = [];
if (pearlsString != "") {
    let pearlsArray = pearlsString.split(",");
    for (let i = 0; i < pearlsArray.length; i += 5) {
        // color, x, z, addedBy, _id
        pearls.push([pearlsArray[i], pearlsArray[i+1], pearlsArray[i+2], pearlsArray[i+3], pearlsArray[i+4]]);
        heatmap.addData({x: parseInt(pearlsArray[i+1])+160, y: parseInt(pearlsArray[i+2])+160, value: 100});
    }
}

// Populate pearls
var pearlColors = [];
populatePearls();
function populatePearls() {
    var path = window.location.pathname.split("/");
    const inputTownx = parseInt(path[2]);
    const inputTownz = parseInt(path[3]);
    const inputFilter = path[4];
    document.getElementById("townCoords").innerHTML = "Town: " + inputTownx + ", " + inputTownz;
    document.getElementById("townx").value = inputTownx;
    document.getElementById("townz").value = inputTownz;
    document.getElementById("filter").value = inputFilter;
    let heatArray = [];
    pearls.forEach(doc => {

        // Create pearl array
        let exists = false;
        for (let i = 0; i < pearlColors.length; i++) {
            if (pearlColors[i].color == doc[0]) {
                exists = true
                pearlColors[i].count ++;
            }
        }
        if (!exists) {
            pearlColors.push({color: doc[0], count: 1});
        }

        // Draw pearls
        var x = parseInt(doc[1]) + 160;
        var z = parseInt(doc[2]) + 160;

        let bgpearl = document.createElementNS('http://www.w3.org/2000/svg','circle');
        bgpearl.setAttribute("cx", x);
        bgpearl.setAttribute("cy", z);
        bgpearl.setAttribute("r", 3);
        bgpearl.setAttribute("fill", "black");
        bgpearl.setAttribute("addedBy", doc[3]);
        bgpearl.setAttribute("id", doc[4]);
        bgpearl.classList.add("circle");
        

        let newpearl = document.createElementNS('http://www.w3.org/2000/svg','circle');
        newpearl.setAttribute("cx", x);
        newpearl.setAttribute("cy", z);
        let color = doc[0];
        if (color == 'none') { color = 'grey'; }
        newpearl.setAttribute("fill", color);
        bgpearl.setAttribute("storedColor", color);
        newpearl.setAttribute("r", 2);
        
        document.getElementById("svg").appendChild(bgpearl);
        document.getElementById("svg").appendChild(newpearl);
        // console.log("added pearl at", x - 160, z - 160)
    });
}

// Sort pearl array
let unsorted = true;
// While unsorted
while (unsorted) {
    unsorted = false;
    // Loop through array
    for (let i = 0; i < pearlColors.length - 1; i++) {
        // If pearlsCount < array+1.pearlsCount
        if (pearlColors[i].count < pearlColors[i+1].count) {
            unsorted = true;
            // Swap
            let temp = pearlColors[i];
            pearlColors[i] = pearlColors[i+1];
            pearlColors[i+1] = temp;
        }
    }
}

console.log(pearlColors);
// Draw pearl table
let allPearls = pearls.length;
let html = "<table><tr><th>Color</th><th>Count</th><th>Percent</th></tr>";
for (let i = 0; i < pearlColors.length; i++) {
    let percent = Math.round((pearlColors[i].count/allPearls)*10000)/100;
    html += `<tr><td>${capitalize(pearlColors[i].color)}</td><td>${pearlColors[i].count}</td><td>${percent}%</td></tr>`;
}
html += "</table>";
document.getElementById("pearlCount").innerHTML = html;

// Circle selection
function capitalize(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

var selectedObject;
var selectedLocked = false;
var selected = "";
function circle() {
    let x = this.getAttribute("cx") - 160;
    let z = this.getAttribute("cy") - 160;
    let addedBy = this.getAttribute("addedBy");
    let color = this.getAttribute("storedColor");
    if (!selectedLocked) { 
        selected = this.getAttribute("id");
        selectedObject = this;
    }
    if (color == "grey") { color = "unknown"; }
    document.getElementById("coords").innerHTML = capitalize(color) + " pearl at " + x + ", " + z
    + "\n\nadded by: " + addedBy;
}
async function select() {
    // console.log(selected, selectedObject)
    let addedBy = selectedObject.getAttribute("addedBy");
    const response = await fetch(`/route/getUsername`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    const ref = await response.json();
    // console.log(ref.username)
    
    if (addedBy == ref.username && selected != "") {
        selectedLocked = true;
        // console.log(addedBy, ref.username)
        var x = selectedObject.getAttribute("cx") - 160;
        var z = selectedObject.getAttribute("cy") - 160;
        var color = selectedObject.getAttribute("storedColor")
        var deletion = document.querySelector("#deletion");
        deletion.style.contentVisibility = "visible";
        deletion.querySelector("#name").innerHTML = "Delete " + color + " pearl at " + x + ", " + z + "?";
    }
}

let circles = document.getElementsByClassName("circle");
for (let i = 0; i < circles.length; i++) {
    circles[i].addEventListener("mousemove", circle);
}
document.getElementById("svg").addEventListener("click", select);

// Pearl deletion
document.getElementById("close").addEventListener("click", () => {
    var deletion = document.querySelector("#deletion");
    deletion.style.contentVisibility = "hidden";
    selectedLocked = false;
});

document.getElementById("delete").addEventListener("click", async () => {
    const response = await fetch(`/route/removePearl`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: selected
        })
    });
    const ref = await response.json();
    // console.log('finished', ref)
    if (response.ok) {
        location.reload();
        selectedLocked = false;
    }
});


// Search town
async function workPlease() {
    var inputTownx = document.getElementById("townx").value;
    var inputTownz = document.getElementById("townz").value;
    var inputFilter = document.getElementById("filter").value;
    location.href = "/loggedin/"+inputTownx+"/"+inputTownz+"/"+inputFilter;
}
document.getElementById("searchmap").addEventListener("click", workPlease);

// Add pearl
async function addPearl() {
    var path = window.location.pathname.split("/");
    const inputTownx = parseInt(path[2]);
    const inputTownz = parseInt(path[3]);

    const inputx = document.getElementById("x").value;
    const inputz = document.getElementById("z").value;

    const inputtype = document.getElementById("type").value;

    // console.log(inputTownx, inputTownz, inputx, inputz, inputtype)

    const response = await fetch(`/route/addPearl`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            x: inputx,
            z: inputz,
            type: inputtype,
            townx: inputTownx.toString(),
            townz: inputTownz.toString()
        })
    });
    const ref = await response.json();
    // console.log('finished', ref)
    if (response.ok) {
        location.reload();
    }
}

document.getElementById("addpearl").addEventListener("click", addPearl);

// It's almost harvesting season
document.addEventListener("keypress", function(event) {
  if (event.key === 'h' || event.key === 'H') {
    var audio = new Audio("/IT'S ALMOST HARVESTING SEASON.mp3");
    audio.volume = 0.25;
    audio.play();
  }
});