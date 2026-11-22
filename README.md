# Email Screenshot

Free from Unslop.email (https://unslop.email).

Adds a button to the Gmail toolbar (right after the ⋮) that saves the open email as a full-length image. Runs entirely in your browser. No account, no server, nothing leaves your computer.

## Install

**[Download email-screenshot.zip](https://github.com/equal-strain/email-screenshot/raw/main/email-screenshot.zip)**

1. Unzip the folder and move it somewhere permanent. Chrome loads it from that spot every time it starts, so don't leave it in Downloads.
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and pick the `email-screenshot` folder
5. Reload Gmail

Works in Chrome, Edge, Brave and Arc.

## Use

Open an email, then:

| Action | Result |
|---|---|
| Click | Saves the email as a JPG |
| Shift + click | Adds a strip with subject, sender and date |
| Alt/Option + click | Copies the image instead of downloading it |

Files are named `brand_subject_date.jpg`, so a swipe folder sorts itself.

## Export a whole list

Search for something (like a brand name) or open a label, then click **Export all** next to the refresh button. The extension opens each email in turn, saves it as a JPG and moves through every page of results. When it's done you get one folder in Downloads with all the images and an `emails.csv` listing brand, sender, subject and date for each file.

- Leave the tab open while it runs. Click **Stop** in the panel to end early. Everything saved so far stays.
- Opening each email marks it as read.
- If Chrome asks where to save every file, turn off "Ask where to save each file" in Chrome's download settings first.

## If something's off

- **"Message clipped"**: Gmail cuts off long emails. Click "View entire message" first, then export. In a batch export, clipped emails are saved as they are and marked in the CSV.
- **Fonts look different**: some web fonts don't render. Most emails use standard fonts, so this is rare.
- **Button disappeared**: Gmail changes its layout now and then. Grab the latest version from unslop.email.
