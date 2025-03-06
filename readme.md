
# GConnect Custom WiFi Portal (GCONNECT-CWP)
**GConnect Custom WiFi Portal (GCONNECT-CWP)** is a custom captive portal designed for Omada controllers, providing a seamless and user-friendly interface for WiFi access. This portal is tailored to enhance the user experience with a visually appealing design and straightforward functionality.

## Interface Description
The GCONNECT-CWP interface features a clean and modern design with a blue color scheme that is both inviting and easy on the eyes. The interface is divided into several sections, each serving a specific purpose:

1. Header Section:
The top section displays the title "GConnect Feeds" in bold white text.
Below the title, there is a prompt to "Check our wifi rates!" encouraging users to explore more about the service.
A "SEE MORE" button is prominently displayed, inviting users to click for additional information.

2. Main Section:
The main section features the GConnect logo, which includes the text "GConnect" with a stylized WiFi symbol integrated into the design.
A greeting message "Good evening!" is displayed below the logo, adding a personal touch to the user experience.

3. Voucher Code Section:
This section is designed for users to enter their voucher codes to access the WiFi service.
The heading "Stream, Play & Enjoy" emphasizes the high-speed capabilities of the service, with a subheading stating "Up to 50Mbps download/upload speed!".
A text box labeled "Enter voucher code" is provided for users to input their codes.
A large, circular button with the number "8" is positioned next to the text box, likely indicating the number of available connections or a step in the process.
A "GCONNECT" button is prominently displayed at the bottom, allowing users to submit their voucher codes and gain access to the WiFi service.

4. Wi-Fi Rates Page (See More):
When users click the "SEE MORE" button, they are directed to a page displaying a detailed table of Wi-Fi rates provided by GCONNECT WIFI.
The table lists different pricing options, the corresponding time duration for each price, and the number of users allowed for each option. The prices are listed in Philippine Pesos (₱).

### Wi-Fi Rates:
## CASH OPTION ONLY:
Below the table, there is a disclaimer about the internet timer and the automatic pause timer.

## DISCLAIMER:
- NOTE: Internet timer starts upon entering the voucher code.
- Automatic PAUSE timer is only applicable to hourly rates.
- The page concludes with a call to action to get connected with GCONNECT WIFI.

The images showcase the interface of the GConnect Custom WiFi Portal, designed to provide users with an easy and visually appealing way to access WiFi services. The interface demonstrates a user-friendly design and functionality, making it an excellent choice for businesses and venues looking to offer seamless WiFi access to their customers.


## Demo
-   [GConnect App Demo](https://www.youtube.com/watch?v=eXLdvv9VYJA)
-   [GConnect Installation & Configuration](https://www.youtube.com/watch?v=O_8u0-8A6Nk)


## Authors
- [@cleifwork](https://www.github.com/cleifwork)


## Installation & Configuration
**INVOLVED APPS:**
- Omada Cloud Controller (Web)
- GConnect App (Desktop)
- Google Drive (Web)
- MacroDroid (Mobile)
- GCash | Maya (Mobile)

### REQUIREMENTS:
**1. SHOULD HAVE A WINDOWS PC/LAPTOP** 
> [!NOTE] 
> _Tested in Windows 10 and Windows 11_
		
- Download the **[GCONNECT-V3](https://github.com/cleifwork/GCONNECT/tree/GCONNECT-V3)**
- Click Code > Download Zip
- Extract main folder to your Desktop
- Launch the app thru _'LaunchPad.bat'_.

## Running Tests
- (MD) Click on **'Local Variables'** to verify if the voucher codes have been successfully added to their respective amounts.
- Send amount to the Server Phone's registered e-wallet (Gcash | Maya) number.
    - Sender should receive WiFi Voucher via SMS. 


## Optimizations
- Added checks for all required columns (Code, Price, Duration, Type)
- Optimized and refactored error handling 
- Added utility script for common paths and functions
- The app is now portable no python and node.js intallation needed (launch anywhere)
- Implemented cache-busting in PRINT VOUCHER function (no need to clear cache when loading new source file)


## Screenshots
![App Screenshot](https://drive.google.com/uc?export=view&id=1e4YSlZMKv2KPSJopF8owPT_tNJgetqAF)


## Support
#### Join our FB Group
[GConnect App (Omada Voucher Solution)](https://www.facebook.com/groups/1776872022780742) 
  
#### Or subcribe to our YouTube Channel
[@JDIYMPH](https://www.youtube.com/channel/UC9O3ezuyjS7C6V7-ZAHCQrA)


## Tech Stack
- **Client:** Python, HTML, Batch, JS
- **Server:** Node.JS, GDrive, MacroDroid


