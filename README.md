# DachaMoney

A CoinKeeper-style spending tracker that pulls transactions from all your bank accounts and credit cards automatically. It runs entirely in Safari on the phone. Data stays on the device, and there is no server.

## How the bank connection works

The app uses [SimpleFIN Bridge](https://bridge.simplefin.org) (about $1.50 a month). SimpleFIN logs in to your banks; the app only gets a read-only key to your balances and transactions. SimpleFIN accepts requests directly from the browser, so the phone talks to it with nothing in between.

1. Sign up at bridge.simplefin.org and connect each bank and card.
2. In SimpleFIN, go to **Apps → New connection** and copy the setup token.
3. In the app, go to **Settings → Bank connection**, paste the token and tap **Connect**.

After that, opening the app syncs automatically (at most once an hour). You can also pull new transactions with **Menu → Synchronize data**, or by tapping the sync status next to the month.

What sync does with each new bank transaction:

- **Category.** Chosen from payees you've categorized before, then the merchant category code (MCC) from the bank, then keywords. Move a transaction to another category and that payee follows from then on.
- **Card payments.** A $500 payment from checking to AMEX becomes one transfer between those two coins, not an expense plus income.
- **Refunds.** Money back on a card reduces that category's spending.
- **Paychecks.** Payroll deposits go to *Salary*. Other deposits go to *Other*.
- **No duplicates.** Transactions you entered by hand or imported from a CoinKeeper CSV are matched to the bank's copy instead of being added twice.

## Install on the phone

GitHub Pages serves the app from this repo (Settings → Pages → deploy from `main`, root folder). Open the Pages URL in Safari, tap **Share → Add to Home Screen**, and always open the app from that icon. Storage belongs to that web address, so a preview or a downloaded copy starts empty. Use **Settings → Download backup** now and then.

## Files

| Path | What it is |
|------|------------|
| `index.html` | Page shell |
| `css/app.css` | All styles |
| `js/store.js` | Data model, storage (`localStorage`, key `dachamoney_v3`), CoinKeeper CSV import, export, backup |
| `js/sync.js` | SimpleFIN sync: fetching, account linking, categorization, transfer pairing, de-duplication |
| `js/ui.js` | Every screen: coin grid, drag to record, calculator entry, detail, feed, add/edit form, drawer, settings, help |

The storage format is unchanged from the earlier single-file version, so data already on a phone keeps loading after an update.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. To try sync without a real bank, paste SimpleFIN's public demo access URL `https://demo:demo@beta-bridge.simplefin.org/simplefin` into the token field.
