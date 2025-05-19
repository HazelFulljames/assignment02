
// Get id of class variable
let pearlsString = document.getElementsByClassName("variable")[0].id;
// Remake an array out of it
let pearlsArray = pearlsString.split(",");
let pearls = [];
for (let i = 0; i < pearlsArray.length; i += 4) {
    pearls.push([pearlsArray[i], pearlsArray[i+1], pearlsArray[i+2], pearlsArray[i+3]]);
}


populatePearls();
function populatePearls() {
    var path = window.location.pathname.split("/");
    const inputTownx = parseInt(path[2]);
    const inputTownz = parseInt(path[3]);
    document.getElementById("townCoords").innerHTML = "Town: " + inputTownx + ", " + inputTownz;
    pearls.forEach(doc => {

        var x = parseInt(doc[1]) + 160;
        var z = parseInt(doc[2]) + 160;

        let newpearl = document.createElementNS('http://www.w3.org/2000/svg','circle');
        newpearl.setAttribute("cx", x);
        newpearl.setAttribute("cy", z);
        newpearl.setAttribute("addedBy", doc[3]);
        let color = doc[0];
        if (color == 'none') { color = 'grey'; }
        newpearl.setAttribute("fill", color);
        newpearl.setAttribute("r", 3);
        newpearl.classList.add("circle");
        document.getElementById("svg").appendChild(newpearl);
        // console.log("added pearl at", x - 160, z - 160)
    });
}

var selected;
function circle() {
    let x = this.getAttribute("cx") - 160;
    let z = this.getAttribute("cy") - 160;
    let addedBy = this.getAttribute("addedBy");
    document.getElementById("coords").innerHTML = "Coordinates: " + x + ", " + z
    + "\n\nAdded By: " + addedBy;
}
async function select() {
    let addedBy = this.getAttribute("addedBy");
    const response = await fetch(`/route/getUsername`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    const ref = await response.json();
    
    if (addedBy == ref.username) {
        // console.log(addedBy, ref.username)
        selected = this;
        var x = this.getAttribute("cx") - 160;
        var z = this.getAttribute("cy") - 160;
        var deletion = document.querySelector("#deletion");
        deletion.style.contentVisibility = "visible";
        deletion.querySelector("#name").innerHTML = "Delete Pearl: " + x + ", " + z + "?"
    }
}

let circles = document.getElementsByClassName("circle");
for (let i = 0; i < circles.length; i++) {
    circles[i].addEventListener("mousemove", circle);
    circles[i].addEventListener("click", select);
}


async function workPlease() {
    var inputTownx = document.getElementById("townx").value;
    var inputTownz = document.getElementById("townz").value;
    location.href = "/loggedin/"+inputTownx+"/"+inputTownz;
}
document.getElementById("searchmap").addEventListener("click", workPlease);


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
    console.log('finished', ref)
    if (response.ok) {
        location.reload();
    }
}

document.getElementById("addpearl").addEventListener("click", addPearl);