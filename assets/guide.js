(() => {
	'use strict';

	const dataElement = document.getElementById('item-data');
	const items = dataElement ? JSON.parse(dataElement.textContent) : {};
	const tip = document.getElementById('tooltip');
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const checkMode = /[?&]check(?:[=&]|$)/.test(location.search);
	let current = null;
	let docked = false;
	let lastPointer = 'mouse';

	const keysOf = (slot) => slot.dataset.items.split(' ');
	const itemOf = (slot) => items[keysOf(slot)[slot.dataset.index ? Number(slot.dataset.index) : 0]];

	function fill(slot) {
		const item = itemOf(slot);
		if (!item || !tip) {
			return false;
		}
		tip.textContent = '';
		const add = (text, className) => {
			const line = document.createElement('div');
			line.className = className;
			line.textContent = text;
			tip.append(line);
		};
		add(item.n, 't-name');
		for (const line of item.l) {
			add(line, 't-line');
		}
		const count = keysOf(slot).length;
		if (count > 1) {
			add(`${count} 種類のどれでもよい`, 't-line');
		}
		add(item.m, 't-mod');
		return true;
	}

	function place(x, y) {
		tip.classList.remove('docked');
		tip.hidden = false;
		const rect = tip.getBoundingClientRect();
		let left = x + 12;
		let top = y - rect.height - 4;
		if (left + rect.width > window.innerWidth - 4) {
			left = Math.max(4, x - rect.width - 12);
		}
		if (top < 4) {
			top = Math.min(y + 16, window.innerHeight - rect.height - 4);
		}
		tip.style.left = `${left}px`;
		tip.style.top = `${Math.max(4, top)}px`;
	}

	function show(slot, x, y) {
		current = slot;
		docked = false;
		if (fill(slot)) {
			place(x, y);
		}
	}

	function dock(slot) {
		current = slot;
		docked = true;
		if (fill(slot)) {
			tip.classList.add('docked');
			tip.hidden = false;
		}
	}

	function hide() {
		current = null;
		docked = false;
		if (tip) {
			tip.hidden = true;
			tip.classList.remove('docked');
		}
	}

	const slotAt = (target) => (target instanceof Element ? target.closest('.slot[data-items]') : null);

	document.addEventListener('pointerdown', (event) => {
		lastPointer = event.pointerType || 'mouse';
	}, { passive: true });

	document.addEventListener('pointerover', (event) => {
		if (event.pointerType === 'touch' || docked) {
			return;
		}
		const slot = slotAt(event.target);
		if (slot) {
			show(slot, event.clientX, event.clientY);
		}
	});

	document.addEventListener('pointermove', (event) => {
		if (current && !docked && event.pointerType !== 'touch') {
			place(event.clientX, event.clientY);
		}
	}, { passive: true });

	document.addEventListener('pointerout', (event) => {
		if (event.pointerType === 'touch' || docked) {
			return;
		}
		const slot = slotAt(event.target);
		if (slot && !slot.contains(event.relatedTarget)) {
			hide();
		}
	});

	document.addEventListener('click', (event) => {
		const slot = slotAt(event.target);
		const touch = lastPointer === 'touch' || window.matchMedia('(hover: none)').matches;
		if (slot && touch) {
			if (current === slot && docked) {
				hide();
			} else {
				dock(slot);
			}
			return;
		}
		if (!slot && docked && !(event.target instanceof Element && event.target.closest('#tooltip'))) {
			hide();
		}
	});

	document.addEventListener('focusin', (event) => {
		const slot = slotAt(event.target);
		if (slot && !docked) {
			const rect = slot.getBoundingClientRect();
			show(slot, rect.right, rect.top);
		}
	});

	document.addEventListener('focusout', (event) => {
		if (slotAt(event.target) && !docked) {
			hide();
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			hide();
		}
	});

	window.addEventListener('scroll', () => {
		if (current && !docked) {
			hide();
		}
	}, { passive: true });

	// The tabs scroll sideways on a phone: start with the current one in view, and drop the shade
	// on the right once the row is scrolled to its end.
	const tabs = document.querySelector('.tabs');
	if (tabs) {
		const currentTab = tabs.querySelector('[aria-current="page"]');
		if (currentTab && tabs.scrollWidth > tabs.clientWidth) {
			tabs.scrollLeft = Math.max(0, currentTab.offsetLeft - (tabs.clientWidth - currentTab.offsetWidth) / 2);
		}
		const shade = () => tabs.classList.toggle('at-end', tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 1);
		shade();
		// The tabs change width once the web font arrives.
		document.fonts?.ready.then(shade);
		tabs.addEventListener('scroll', shade, { passive: true });
		window.addEventListener('resize', shade, { passive: true });
	}

	// Recipes side by side take the width of the widest of them; flex already gives them one height.
	const rows = Array.from(document.querySelectorAll('.recipe-row, .recipe-list'));
	const equalize = (row) => {
		row.style.removeProperty('--recipe-width');
		const widths = Array.from(row.children, (child) => child.getBoundingClientRect().width);
		const widest = Math.ceil(Math.max(0, ...widths));
		if (widest > 0) {
			row.style.setProperty('--recipe-width', `${widest}px`);
		}
	};
	const equalizeAll = () => rows.forEach(equalize);
	equalizeAll();
	document.fonts?.ready.then(equalizeAll);
	window.addEventListener('resize', equalizeAll, { passive: true });
	for (const details of document.querySelectorAll('details')) {
		details.addEventListener('toggle', () => details.querySelectorAll('.recipe-list').forEach(equalize));
	}

	// A tag's items take turns once a second, as JEI shows them.
	const cycling = Array.from(document.querySelectorAll('.slot[data-items*=" "]'));
	if (cycling.length > 0 && !reducedMotion && !checkMode) {
		window.setInterval(() => {
			for (const slot of cycling) {
				const keys = keysOf(slot);
				const index = ((slot.dataset.index ? Number(slot.dataset.index) : 0) + 1) % keys.length;
				slot.dataset.index = String(index);
				const item = items[keys[index]];
				const image = slot.querySelector('img');
				if (item && image) {
					image.src = item.i;
					image.alt = item.n;
					image.classList.toggle('px', item.p === 1);
				}
				if (current === slot) {
					fill(slot);
				}
			}
		}, 1000);
	}

	// ?check writes the layout measures scripts/check-guide-responsive.sh judges.
	if (checkMode) {
		for (const image of document.querySelectorAll('img[loading="lazy"]')) {
			image.loading = 'eager';
		}
		for (const details of document.querySelectorAll('details')) {
			details.open = true;
		}
		const describe = (element) => {
			let text = element.tagName.toLowerCase();
			if (element.id) {
				text += `#${element.id}`;
			}
			if (element.className && typeof element.className === 'string') {
				text += `.${element.className.trim().split(/\s+/).join('.')}`;
			}
			const owner = element.closest('[data-recipe],section');
			if (owner && owner !== element) {
				text += ` in ${owner.getAttribute('data-recipe') || owner.id}`;
			}
			return text;
		};
		window.addEventListener('load', () => {
			window.setTimeout(() => {
				const root = document.documentElement;
				const result = {
					innerWidth: window.innerWidth,
					clientWidth: root.clientWidth,
					scrollWidth: root.scrollWidth,
					overflow: [],
					small: [],
					scale: [],
					images: 0,
				};
				if (root.scrollWidth > root.clientWidth) {
					for (const element of document.querySelectorAll('body *')) {
						const rect = element.getBoundingClientRect();
						if (rect.width > 0 && rect.right > root.clientWidth + 0.5) {
							result.overflow.push(describe(element));
							if (result.overflow.length >= 10) {
								break;
							}
						}
					}
					if (result.overflow.length === 0) {
						result.overflow.push('document');
					}
				}
				if (window.innerWidth <= 1023) {
					for (const element of document.querySelectorAll('.slot[data-items], .tab, summary')) {
						const rect = element.getBoundingClientRect();
						if (rect.width > 0 && (rect.width < 35.5 || rect.height < 35.5)) {
							result.small.push(`${describe(element)} ${rect.width}x${rect.height}`);
						}
					}
				}
				for (const image of document.querySelectorAll('img.px')) {
					const rect = image.getBoundingClientRect();
					if (!image.naturalWidth || rect.width === 0) {
						continue;
					}
					result.images++;
					const scale = rect.width / image.naturalWidth;
					if (Math.abs(scale - Math.round(scale)) > 0.01 || scale < 0.99) {
						result.scale.push(`${image.getAttribute('src')} ${scale}`);
					}
				}
				const nav = document.querySelector('.tabs');
				if (nav) {
					const style = window.getComputedStyle(nav);
					const current = nav.querySelector('[aria-current="page"]');
					const row = nav.getBoundingClientRect();
					const tab = current ? current.getBoundingClientRect() : row;
					result.tabs = {
						overflow: nav.scrollWidth > nav.clientWidth + 0.5,
						scrollable: style.overflowX === 'auto' || style.overflowX === 'scroll',
						currentVisible: tab.left >= row.left - 0.5 && tab.right <= row.right + 0.5,
					};
				}
				const output = document.createElement('pre');
				output.id = 'guide-check';
				output.textContent = JSON.stringify(result);
				document.body.append(output);
			}, 300);
		});
	}
})();
