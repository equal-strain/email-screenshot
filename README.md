# Email Screenshot

Free from Unslop.email (https://unslop.email).

Adds a button to the Gmail toolbar (right after the ⋮) that saves the open email as a full-length image. Runs entirely in your browser. No account, no server, nothing leaves your computer.

## Install

1. Unzip this folder and move it somewhere permanent. Chrome loads it from that spot every time it starts, so don't leave it in Downloads.
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

## If something's off

- **"Message clipped"**: Gmail cuts off long emails. Click "View entire message" first, then export.
- **Fonts look different**: some web fonts don't render. Most emails use standard fonts, so this is rare.
- **Button disappeared**: Gmail changes its layout now and then. Grab the latest version from unslop.email.
