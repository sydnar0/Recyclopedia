//script.js
// initialize model from teachable machine
const URL = "https://teachablemachine.withgoogle.com/models/StMhnUPPq/";


// Setup variables
let model, webcam, labelContainer, webcamContainer, maxPredictions;
// bool to check if there have been enough confident predictions and end the loop
let enoughData = false;
// Dictionary to represent which categories are consistently getting 0.9+ probability
let mostAccurate = {
    "Trash": [],
    "Cardboard": [],
    "Plastics": [],
    "Glass": [],
    "Paper": [],
    "Metal": []
};

// Load the image model and setup the webcam
async function init() {
    if (!webcam) {
        // Play click sound
        document.getElementById("click").play();
        
        // Reset the dictionary
        mostAccurate = {
            "Trash": [],
            "Cardboard": [],
            "Plastics": [],
            "Glass": [],
            "Paper": [],
            "Metal": []
        }
        // Reset enoughData to false
        enoughData = false;

        
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // Reset the trashcan and recycle bin images, middleimg so they are not visible
        const leftImage = document.getElementById("left-side");
        const rightImage = document.getElementById("right-side");
        const middleImage = document.getElementById("middle");
        leftImage.style.display = "none";
        rightImage.style.display = "none";
        middleImage.style.display = "none";

        // load the model and metadata
        // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
        // or files from your local hard drive
        // Note: the pose library adds "tmImage" object to your window (window.tmImage)
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Convenience function to setup a webcam
        const flip = true; // whether to flip the webcam
        webcam = new tmImage.Webcam(200, 200, flip); // width, height, flip
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        // State that the webcam is on and live video is playing
        window.requestAnimationFrame(loop);

        // Define container for webcam
        webcamContainer = document.getElementById("webcam-container");
        
        // append elements to the DOM
        webcamContainer.appendChild(webcam.canvas);
        labelContainer = document.getElementById("label-container");
        labelContainer.style.display = "flex";

        // Remove the extra space created for the images
        const imageContainer = document.getElementById("image-container");
        imageContainer.style.margin = 0;
        
        // We want a single container for our results once a type has been identified
        resultsContainer = document.getElementById("results-container");
        resultsContainer.appendChild(document.createElement("div"));

        for (let i = 0; i < maxPredictions; i++) { // and class labels
            labelContainer.appendChild(document.createElement("div"));
        }
    }
}

async function loop() {
    if (enoughData == true) {return;} 
    else {
        // something is wrong here
        webcam.update(); // update the webcam frame
        await predict();
        window.requestAnimationFrame(loop);
    }
}

async function getFinalPrediction() {
    // Define variables to use while looping
    
    let longest = 0;
    let highestConfidence = 0;
    let name = "";

    for(let key of Object.keys(mostAccurate)) {
        if (longest < mostAccurate[key].length) {
            longest = mostAccurate[key].length;
            
            const getSumOf = mostAccurate[key].map(parseFloat);

            let sum = getSumOf.reduce((a, b) => a + b, 0); // Sum all elements
            highestConfidence = sum / mostAccurate[key].length; // Divide by number of elements to get avg
            console.log("before" +highestConfidence);
            highestConfidence = highestConfidence.toFixed(2);
            console.log("after" +highestConfidence);
            name = key;
        }
    }
    return [name, highestConfidence];
}


// run the webcam image through the image model
async function predict() {
    // predict can take in an image, video or canvas html element
    const prediction = await model.predict(webcam.canvas);

    // maxPredictions = 6 -- one prediction made for each category
    // Let's loop through all the predictions made in this call of predict()
    for (let i=0; i<maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " +(prediction[i].probability*100).toFixed(0)+"%"; 
            labelContainer.childNodes[i].innerHTML = classPrediction;
        
            if (prediction[i].probability >= 0.8) {
                mostAccurate[prediction[i].className].push(prediction[i].probability.toFixed(6));
                if (mostAccurate[prediction[i].className].length > 100) {
                    enoughData = true;
                }
            }
            
        if (enoughData) {
            // await other function to calculate the highest accuracy
            const getBest = await getFinalPrediction(mostAccurate);

            // Return results -- we reached our best guess
            resultsContainer.innerHTML = "This is a "+ getBest[0] +", I'm "+getBest[1]*100+"% sure.";
            // Remove the webcam
            webcamContainer.removeChild(webcamContainer.firstChild);
            webcam = null;
            showImages(getBest[0]);
            break;
        }
    }
    return;
}


// FUNCTION to handle what happens when we drop on the left side (recycle bin)
function handleRecycle(label) {
    if (label == "Trash") {
        resultsContainer.innerHTML = "You shouldn't recycle trash!! ༽◺_◿༼";
        document.getElementById("wrong").play();
    } else {
        resultsContainer.innerHTML = "You recycled "+label+"! ＼(＾O＾)／";
        document.getElementById("yay").play();
    }
}

// FUNCTION to handle what happens when we drop on the right side (trash can)
function handleTrash(label) {
    if (label != "Trash"){
        resultsContainer.innerHTML = "You threw away "+label+", a recyclable! ༽◺_◿༼";
        document.getElementById("wrong").play();
    } else{
        resultsContainer.innerHTML = "You threw away "+label+"! ＼(＾O＾)／" ;
        document.getElementById("yay").play();
    }
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.dataTransfer.setData("label", ev.target.getAttribute("data-label"));
}

function drop(ev, binType) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const middleImage = document.getElementById('middle');
    
    if (data === 'middle') {
        // NOTE that .getData("label") NOT getData("data-label")
        const label = ev.dataTransfer.getData("label");
        if (binType === 'recycle') {
            handleRecycle(label);
        } else if (binType === 'trash') {
            handleTrash(label);
        }
        // Reset the middle image
        middleImage.style.display = 'none';
        middleImage.style.backgroundImage = '';

    } else {
        ev.target.appendChild(document.getElementById(data));
    }
}

//list of image urls for trash and recyclable items
const images = [
    'images/trash.png', 
    'images/plastic.png', 
    'images/paper.png', 
    'images/glass.png', 
    'images/metal.png', 
    'images/cardboard.png'
];

async function showImages(itemClass){
    // Hide the labels and the button
    labelContainer.style.display = "none";
    imageContainer = document.getElementById("image-container");
    imageContainer.style.margin = "100px 0";

    // Fetch images from div ids
    const middleImage = document.getElementById('middle');
    const leftImage = document.getElementById("left-side");
    const rightImage = document.getElementById("right-side");

    //set image depending on classification of item                               
    let chosenImage;
    if (itemClass == "Trash"){
        chosenImage = images[0];
    } else if (itemClass == "Plastics"){
        chosenImage = images[1];
    } else if (itemClass == "Paper"){
        chosenImage = images[2];
    } else if (itemClass == "Glass"){
        chosenImage = images[3];
    } else if (itemClass == "Metal"){
        chosenImage = images[4];
    } else if (itemClass == "Cardboard"){
        chosenImage = images[5];
    }

    //console.log(chosenImage);
    // Set middle image url and make visible
    middleImage.style.backgroundImage = `url(${chosenImage})`;
    middleImage.style.display = 'block';
    middleImage.style.backgroundSize = 'contain';
    middleImage.id = "middle";
    middleImage.setAttribute("draggable", true);
    // Set the data of the object to hold the type of object it is
    middleImage.setAttribute("data-label", itemClass);
    middleImage.ondragstart = drag;

    // Make recycle (left) and trash bin(right) visible
    leftImage.style.display = "block";
    rightImage.style.display = "block";
}