const tableBody = document.querySelector("#papers-table tbody");
const searchInput = document.querySelector("#search");
const headers = Array.from(document.querySelectorAll("th[data-key]"));

let papers = [];
let filtered = [];
let sortState = { key: "title", direction: "asc" };

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[:\\/?*"<>|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-]+|[-]+$/g, "");
}

function getPdfPath(paper) {
  if (paper.pdf) {
    return paper.pdf;
  }
  return `pdfs/${slugify(paper.title)}.pdf`;
}

function renderRows(rows) {
  tableBody.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("tr");
    empty.innerHTML = '<td colspan="5" class="status-cell">No papers match your search.</td>';
    tableBody.appendChild(empty);
    return;
  }

  rows.forEach((paper) => {
    const row = document.createElement("tr");
    const authors = Array.isArray(paper.authors) ? paper.authors.join(", ") : "";
    const presenters = Array.isArray(paper.presenters) ? paper.presenters.join(", ") : "";
    const pdfPath = getPdfPath(paper);
    const dateValue = paper.date || "";
    const dateLabel = dateValue
      ? new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        })
      : "-";

    row.innerHTML = `
      <td>${paper.title}</td>
      <td>${authors}</td>
      <td>${presenters}</td>
      <td>${dateLabel}</td>
      <td>
        <div class="actions">
          <a class="button primary" href="${pdfPath}" target="_blank" rel="noopener">View</a>
          <a class="button" href="${pdfPath}" download>Download</a>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function normalizeSearch(text) {
  return text.toLowerCase();
}

function applySearch() {
  const query = normalizeSearch(searchInput.value);
  filtered = papers.filter((paper) => {
    const title = normalizeSearch(paper.title || "");
    const authors = normalizeSearch((paper.authors || []).join(", "));
    const presenters = normalizeSearch((paper.presenters || []).join(", "));
    const date = normalizeSearch(paper.date || "");
    return title.includes(query) || authors.includes(query) || presenters.includes(query) || date.includes(query);
  });
  applySort(sortState.key, sortState.direction, false);
}

function applySort(key, direction, updateHeader = true) {
  const multiplier = direction === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (key === "date") {
      const fallback = direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      const valueA = a.date ? Date.parse(`${a.date}T00:00:00`) : fallback;
      const valueB = b.date ? Date.parse(`${b.date}T00:00:00`) : fallback;
      return (valueA - valueB) * multiplier;
    }

    const valueA = key === "title" ? a.title : (a[key] || []).join(", ");
    const valueB = key === "title" ? b.title : (b[key] || []).join(", ");
    return valueA.localeCompare(valueB, undefined, { sensitivity: "base" }) * multiplier;
  });

  sortState = { key, direction };
  renderRows(filtered);

  if (updateHeader) {
    headers.forEach((header) => {
      const headerKey = header.dataset.key;
      header.setAttribute(
        "aria-sort",
        headerKey === key ? (direction === "asc" ? "ascending" : "descending") : "none"
      );
    });
  }
}

function handleHeaderClick(event) {
  const key = event.currentTarget.dataset.key;
  const nextDirection =
    sortState.key === key ? (sortState.direction === "asc" ? "desc" : "asc") : "asc";
  applySort(key, nextDirection, true);
}

async function loadPapers() {
  try {
    const response = await fetch("./papers.json");
    if (!response.ok) {
      throw new Error("Unable to load papers.json");
    }
    papers = await response.json();
    filtered = [...papers];
    applySort(sortState.key, sortState.direction, true);
  } catch (error) {
    tableBody.innerHTML = '<tr><td colspan="5" class="status-cell">Failed to load papers. Check that papers.json is present.</td></tr>';
  }
}

searchInput.addEventListener("input", applySearch);
headers.forEach((header) => header.addEventListener("click", handleHeaderClick));

loadPapers();
