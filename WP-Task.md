1️⃣ Build Subject pages
2️⃣ Improve Single Notes page UI
3️⃣ Do final launch checklist (SEO, security, performance, cache, analytic eg. page view, monitoring )

---

2️⃣ Subject landing page (grid of subjects)
3️⃣ Subject page (Science) using this matrix

| Page                             | Default Context (Auto-loaded) | Filters Shown  | Why                          |
| -------------------------------- | ----------------------------- | -------------- | ---------------------------- |
| **West Bengal Board Page** | Board = WB                    | Subject, Class | Board is fixed, users refine |
| **Class X Page**           | Class = X                     | Board, Subject | Future-proof for NCERT       |
| **Subject X Page**         | Subject = X                   | Board, Class   | Compare WB vs NCERT          |


[searchandfilter
  id=""
  post_types="notes"
  fields="board,subject"
  headings="Filter by Board,Filter by Subject"
  class="hindi"
]

subject-hindi-filter                      [wp_show_posts id="640"] - Pending

subject-english-filter                  [wp_show_posts id="634"]

subject-math-filter                     [wp_show_posts id="635"]

subject-science-filter                 [wp_show_posts id="636"]

subject-history-filter                  [wp_show_posts id="639"]

subject-geo-filter                       [wp_show_posts id="638"]
