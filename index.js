// Object for handling AJAX requests
var Ajax = {
  post: function (url, data, fn) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    // Handle response
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 304)) {
        fn.call(this, xhr.responseText); // Call callback function with response
      }
    };
    
    xhr.send(data); // Send data as JSON
  },
};

// Function to get query string parameters from the URL
function getQueryStringKey(key) {
  var params = new URLSearchParams(window.location.search);
  return params.get(key);
}

// Extract relevant parameters from the URL
var clientMac = getQueryStringKey("clientMac");
var apMac = getQueryStringKey("apMac");
var gatewayMac = getQueryStringKey("gatewayMac");
var ssidName = getQueryStringKey("ssidName");
var radioId = getQueryStringKey("radioId");
var vid = getQueryStringKey("vid");
var originUrl = getQueryStringKey("originUrl");
var submitUrl = "/portal/auth"; // Authentication API endpoint
var isCommited = false; // Flag to prevent duplicate submissions

// Error messages mapped to server response codes
var errorHintMap = {
  0: "You are now connected. Enjoy!",
  "-41502": "Incorrect voucher code.",
  "-41503": "This voucher code is expired.",
  "-41504": "The traffic used by this voucher code has reached the limit.",
  "-41505": "The number of users has reached the limit.",
};

// Function to handle form submission
function handleSubmit(event) {
  event.preventDefault(); // Prevent page reload on form submission

  if (isCommited) return; // Prevent multiple submissions

  var voucherCode = document.getElementById("voucherCode").value;
  var hintElement = document.getElementById("oper-hint");

  if (!hintElement) return; // Ensure hint element exists

  // Prepare authentication request payload
  var submitData = {
    authType: 3,
    voucherCode: voucherCode,
    clientMac: clientMac,
    apMac: apMac,
    gatewayMac: gatewayMac,
    ssidName: ssidName,
    radioId: radioId,
    vid: vid,
    originUrl: originUrl,
  };

  isCommited = true; // Mark submission as in progress

  // Send authentication request
  Ajax.post(submitUrl, JSON.stringify(submitData), function (data) {
    try {
      data = JSON.parse(data); // Parse response JSON
    } catch (error) {
      console.error("Invalid JSON response", data);
      hintElement.innerHTML = "Server error. Please try again later.";
      openPopup(); // Show error popup
      isCommited = false;
      return;
    }

    // Display error message based on server response
    hintElement.innerHTML = errorHintMap[data.errorCode] || "Unknown error";

    if (data.errorCode === 0) {
      // Successful authentication
      openPopup(); // Show success popup
      window.location.href = data.landingUrl; // Redirect to landing page
      // Redirect to the Google Forms URL as the landing page
      // window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLScoL8tOp0aHgdL860lZOfnIjEo2xiypcCImhK3R8XB28Q2YQQ/viewform";
    } else {
      isCommited = false; // Allow retries on failure
      openPopup(); // Show error popup
    }
  });
}

// Attach event listeners after the page is loaded
document.addEventListener("DOMContentLoaded", function () {
  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleSubmit); // Bind form submission event
  }

  // Preload login sound effect
  var audio = new Audio("./audio/login.mp3");
  document.getElementById("button-login").addEventListener("click", function () {
    audio.play(); // Play sound effect on login button click
  });
});

// Function to show the popup
function openPopup() {
  var popcheck = document.getElementById("popcheck");
  if (popcheck) popcheck.classList.add("open-popup");
}

// Function to close the popup
function closePopup() {
  var popcheck = document.getElementById("popcheck");
  if (popcheck) popcheck.classList.remove("open-popup");
}

// Get references to the button, modal, and close button
const ewalletButton = document.getElementById('ewallet-pay-btn');
const modal = document.getElementById('image-modal');
const closeButton = document.querySelector('.close-button');

// Show the modal when the button is clicked
ewalletButton.addEventListener('click', () => {
    modal.style.display = 'block';
});

// Close the modal when the close button is clicked
closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close the modal if the user clicks outside the modal content
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
