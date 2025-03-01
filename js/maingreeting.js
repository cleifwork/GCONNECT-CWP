const time = new Date().getHours(); // Get the current hour (0–23).
let greeting;

// Adjust the ranges for greetings
if (time >= 5 && time < 12) { 
  greeting = "Good morning!"; // Morning: 5 AM to 11:59 AM
} else if (time >= 12 && time < 18) {
  greeting = "Good afternoon!"; // Afternoon: 12 PM to 5:59 PM
} else {
  greeting = "Good evening!"; // Evening: 6 PM to 4:59 AM
}

// Update the HTML content dynamically
document.getElementById("maingreeting").innerHTML = greeting;
