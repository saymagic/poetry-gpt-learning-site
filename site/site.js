const progress = document.getElementById("progress");
const links = Array.from(document.querySelectorAll(".side-nav a"));
const sections = links
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function updateProgress() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  const pct = height > 0 ? (scrollTop / height) * 100 : 0;
  progress.style.width = `${pct}%`;

  let activeId = "";
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 120) {
      activeId = section.id;
    }
  }
  links.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
  });
}

document.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

document.querySelectorAll(".copy-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const block = button.closest(".code-block");
    const code = block?.querySelector("code")?.innerText || "";
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = "已复制";
      setTimeout(() => {
        button.textContent = "复制";
      }, 1200);
    } catch {
      button.textContent = "复制失败";
      setTimeout(() => {
        button.textContent = "复制";
      }, 1200);
    }
  });
});

const search = document.getElementById("chapterSearch");
const chapters = Array.from(document.querySelectorAll(".chapter"));
if (search) {
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    chapters.forEach((chapter) => {
      const haystack = `${chapter.dataset.title || ""} ${chapter.innerText}`.toLowerCase();
      chapter.classList.toggle("hidden", query.length > 0 && !haystack.includes(query));
    });
  });
}

