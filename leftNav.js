const navItems = document.querySelectorAll('.nav-item');
        const pageContents = document.querySelectorAll('.page-content');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all nav items and pages
                navItems.forEach(nav => nav.classList.remove('active'));
                pageContents.forEach(page => page.classList.remove('active'));

                // Add active class to clicked item and corresponding page
                item.classList.add('active');
                const pageName = item.getAttribute('data-page');
                document.getElementById(pageName).classList.add('active');
            });
        });

const navContainer = document.querySelector('.nav-items');
        const stackOffset = 20;

        function updateStack() {
            const items = Array.from(navContainer.querySelectorAll('.nav-item'));
            const baseHeight = items[0]?.offsetHeight || 140;
            navContainer.style.height = `${baseHeight}px`;

            items.forEach((item, index) => {
                item.style.zIndex = items.length - index;
                item.style.transform = `translateY(0)`;
            });
        }

        function activateItem(clickedItem) {
            const items = Array.from(navContainer.querySelectorAll('.nav-item'));

            items.forEach(item => item.classList.remove('active'));
            pageContents.forEach(page => page.classList.remove('active'));

            clickedItem.classList.add('active');
            const pageId = clickedItem.dataset.page;
            const targetPage = document.getElementById(pageId);
            if (targetPage) targetPage.classList.add('active');

            const activeIndex = items.indexOf(clickedItem);
            items.forEach((item, index) => {
                item.classList.remove('above-active', 'below-active');
                if (item !== clickedItem) {
                    if (index < activeIndex) {
                        item.classList.add('above-active');
                    } else if (index > activeIndex) {
                        item.classList.add('below-active');
                    }
                }

                if (item === clickedItem) {
                    item.style.zIndex = items.length;
                    item.style.height = '220px';
                    item.style.minHeight = '220px';
                } else {
                    item.style.zIndex = items.length - index;
                    item.style.height = '150px';
                    item.style.minHeight = '150px';
                }
            });
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', event => {
                event.preventDefault();
                activateItem(event.currentTarget);
            });
        });

        window.addEventListener('load', updateStack);
        window.addEventListener('resize', updateStack);