
// Get id of class variable
let pearlsString = document.getElementsByClassName("variable")[0].id;
// Remake an array out of it
let pearlsArray = pearlsString.split(",");
let pearls = [];
for (let i = 0; i < pearlsArray.length; i+=3) {
    pearls.push([pearlsArray[i], pearlsArray[i+1], pearlsArray[i+2]]);
}


populatePearls();
function populatePearls() {
    pearls.forEach(doc => {

        var x = parseInt(doc[1]) + 160;
        var z = parseInt(doc[2]) + 160;

        let newpearl = document.createElementNS('http://www.w3.org/2000/svg','circle');
        newpearl.setAttribute("cx", x);
        newpearl.setAttribute("cy", z);
        let color = doc[0];
        if (color == 'none') { color = 'grey'; }
        newpearl.setAttribute("fill", color);
        newpearl.setAttribute("r", 3);
        newpearl.classList.add("circle");
        document.getElementById("svg").appendChild(newpearl);
        // console.log("added pearl at", x - 160, z - 160)
    });
}


function circle() {
    let x = this.getAttribute("cx") - 160;
    let z = this.getAttribute("cy") - 160;
    document.getElementById("coords").innerHTML = "Coordinates: " + x + ", " + z;
}
let circles = document.getElementsByClassName("circle");
for (let i = 0; i < circles.length; i++) {
    circles[i].addEventListener("mousemove", circle)
}


async function workPlease() {
    var inputTownx = document.getElementById("townx").value;
    var inputTownz = document.getElementById("townz").value;
    location.href = "/loggedin/"+inputTownx+"/"+inputTownz;
}
document.getElementById("searchmap").addEventListener("click", workPlease);


async function addPearl() {
    const inputTownx = document.getElementById("townx").value;
    const inputTownz = document.getElementById("townz").value;

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
            townx: inputTownx,
            townz: inputTownz
        })
    });
    const ref = await response.json();
    console.log('finished', ref)
    location.reload();

    
}

document.getElementById("addpearl").addEventListener("click", addPearl);