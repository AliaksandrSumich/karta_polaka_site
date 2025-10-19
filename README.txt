pytania_karta_polaka_landing
===========================

Live: https://learnpolish.click/

Files:
- index.html         (main single-page site)
- css/style.css
- js/script.js
- assets/logo.jpg
- assets/sample1.jpg
- assets/sample2.jpg
- robots.txt
- sitemap.xml

Notes:
- All meta tags (title/description/OG/canonical) are set to learnpolish.click.
- UI supports RU and PL only; content switches client-side.
- Quiz pulls 20 losowych pytań z pliku CSV: "Вопросы на карту поляка.csv".
- Obrazy do pytań pobierane są z folderu images/ zgodnie z kolumną CSV.
- Brak backendu; wszystko jest statyczne.

Quick deploy:
- GitHub Pages / Vercel / Netlify: deploy as static site root.
- Remember to upload the images/ folder with all quiz images.
