# Kevin & Adamar

Wedding site for Kevin and Adamar Wagner.
Saturday the fourteenth of November, 2026, Saint Joseph's Church, Modesto.

A single static page. No build step, no dependencies.

## How the RSVP works

`Invitations` and `Replies` live in a Google Sheet. A guest enters the code
printed on their invitation; the page asks the sheet how many seats that code
holds, renders that many blank seats, and posts the answers back.

- `index.html` is the whole site. The endpoint is the `ENDPOINT` constant.
- `apps-script/Code.gs` is the Google Apps Script bound to that sheet,
  deployed as a web app with **Execute as: me** and **Who has access: anyone**.

The POST is deliberately sent as `text/plain`. Apps Script does not answer CORS
preflight requests, and a JSON content type would provoke one.

Nobody is named in advance. The sheet holds a code and a seat count, and the
guests supply their own names, which is also how the names reach the Replies
tab.
