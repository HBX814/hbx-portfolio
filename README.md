# hbx — portfolio

Personal portfolio of Harsh Bhati, Generative AI engineer.

Live: https://harsh-bhati-one.vercel.app

Static site (HTML/CSS/JS) with GSAP ScrollTrigger and Lenis. The intro scrubs a skull scan video with scroll, the rest of the page runs over a HUD video that turns to red alert at the contact section. Videos in `assets/` are encoded with a keyframe on every frame so seeking stays smooth.

Run locally: `python -m http.server` in this folder, then open http://localhost:8000.
Deploy: `vercel deploy --prod`.
