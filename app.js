const linkGrid = document.querySelector(".link-grid");
const filters = document.querySelector(".filters");
const search = document.querySelector(".search");
const searchClear = document.querySelector(".search-clear");

let activeCategory = "all";
let links = [];

const getDomain = (url) =>
	new URL(url).hostname.replace(/^www\./, "");

const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

const faviconHtml = (title, favicon) =>
	favicon
		? `<img class="link-favicon" src="${favicon}" alt="" loading="lazy">`
		: `<img class="no-favicon" src="default.png" alt="" loading="lazy">`;

const createLink = ({
	url,
	title,
	category,
	domain,
	favicon,
}) => `
<a
	class="link"
	href="${url}"
	target="_blank"
	rel="noopener"
>
	<div class="link-left">
		${faviconHtml(title, favicon)}
		<div class="link-title">${title}</div>
	</div>

	<div class="link-right">
		<div class="link-domain">${domain} &nearr;</div>
	</div>
</a>
`;

const renderFilters = (categories) => {
	const counts = links.reduce((acc, link) => {
		acc[link.category] = (acc[link.category] || 0) + 1;
		return acc;
	}, {});

	filters.innerHTML = categories
		.map((category) => {
			const count =
				category === "all"
					? links.length
					: counts[category] || 0;

			return `
<button
	class="filter"
	type="button"
	data-category="${category}"
	aria-pressed="${category === activeCategory}"
>
	${category} <span class="filter-count">${count}</span>
</button>`;
		})
		.join("");
};

const render = () => {
	const query = search.value.trim().toLowerCase();

	const visibleLinks = links.filter((link) => {
		const matchesCategory =
			activeCategory === "all" ||
			link.category === activeCategory;

		return (
			matchesCategory &&
			link.searchText.includes(query)
		);
	});

	if (!visibleLinks.length) {
		linkGrid.innerHTML =
			'<p class="empty">Nothing here yet. Try another search or category.</p>';
		return;
	}

	linkGrid.innerHTML = visibleLinks
		.map(createLink)
		.join("");
};

filters.addEventListener("click", (event) => {
	const button = event.target.closest(".filter");

	if (!button) return;

	activeCategory = button.dataset.category;

	shuffle(links);

	document.querySelectorAll(".filter").forEach((filter) => {
		filter.setAttribute(
			"aria-pressed",
			filter === button
		);
	});

	render();
});

linkGrid.addEventListener(
	"error",
	(event) => {
		if (!event.target.matches(".link-favicon")) {
			return;
		}

		const img = event.target;
		const title = img
			.closest(".link")
			.querySelector(".link-title")
			.textContent;

		img.outerHTML = `
<span class="link-fallback">
	${title.slice(0, 2)}
</span>`;
	},
	true
);

const syncSearchClear = () => {
	const hasSearchValue = search.value.length > 0;

	searchClear.hidden = !hasSearchValue;
	aboutLink.hidden = hasSearchValue;
};

search.addEventListener("input", () => {
	syncSearchClear();
	render();
});

searchClear.addEventListener("click", () => {
	search.value = "";
	syncSearchClear();
	search.focus();
	render();
});

const modal = document.querySelector(".modal");
const aboutLink = document.querySelector(".about-link");

const openModal = () => modal.removeAttribute("hidden");
const closeModal = () => modal.setAttribute("hidden", "");

aboutLink.addEventListener("click", openModal);

modal.addEventListener("click", (event) => {
	if (event.target.hasAttribute("data-close")) {
		closeModal();
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && !modal.hidden) {
		closeModal();
	}
});

fetch("./links.json")
	.then((response) => {
		if (!response.ok) {
			throw new Error(
				`Could not load links: ${response.status}`
			);
		}

		return response.json();
	})
	.then((data) => {
		links = data.map((link) => {
			const domain = getDomain(link.url);
			const category = link.tags?.[0] || "other";

			return {
				...link,
				domain,
				category,
				searchText: [
					link.title,
					link.description || "",
					domain,
					category,
					...(link.tags || []),
				]
					.join(" ")
					.toLowerCase(),
			};
		});

		const categories = [
			"all",
			...new Set(
				links
					.map((link) => link.category)
					.sort()
			),
		];

		shuffle(links);

		renderFilters(categories);
		render();
	})
	.catch((error) => {
		console.error(error);

		linkGrid.innerHTML =
			'<p class="empty">The link feed could not be loaded.</p>';
	});
