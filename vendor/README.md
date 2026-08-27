# vendor/

`greenhousegas-rcp-2017.csv` is the CO₂ emissions file from the original 2017
build, kept for exactly one thing: its IPCC RCP3PD / RCP4.5 / RCP6 / RCP8.5
scenario columns for `World`, 2012–2200. Those are the only figures in this
project that cannot be re-fetched from a live source — `scripts/fetch-data.mjs`
reads this file, keeps only the projection rows past the latest observed year,
and discards the rest (the historical emissions columns are replaced with
current Our World in Data figures on every refresh).
