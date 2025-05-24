document.getElementById("submit").addEventListener("click", async () => {
    let msg = document.getElementById("suggestion").value;
    const response = await fetch(`/route/addSuggestion`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: msg
        })
    });
    const ref = await response.json();
    // console.log('finished', ref)
    if (response.ok) {
        document.getElementById("suggestionDiv").innerHTML = "Suggestion Submitted! Thank you!";
    }
});