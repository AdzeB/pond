export function buildArticleRectExpression(tweetId: string): string {
  /** Scroll to top, not center: centering yields a negative top that clips the article. */
  return `(async () => {
    try {
      const tweetId = ${JSON.stringify(tweetId)};
      const findArticle = () => {
        const anchor = document.querySelector('a[href*="/status/' + tweetId + '"]');
        return anchor && anchor.closest('article');
      };
      const articleDeadline = Date.now() + 10_000;
      let article = findArticle();
      while (!article && Date.now() < articleDeadline) {
        await new Promise(r => setTimeout(r, 200));
        article = findArticle();
      }
      if (!article) return null;

      /** Hide every other timeline cell so replies and the composer can't bleed into the clip. */
      try {
        const cell = article.closest('[data-testid="cellInnerDiv"]');
        if (cell) {
          for (const c of document.querySelectorAll('[data-testid="cellInnerDiv"]')) {
            if (c !== cell) c.style.setProperty('display', 'none', 'important');
          }
        }
      } catch (_) {}

      window.scrollTo(0, 0);
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
      await new Promise(r => requestAnimationFrame(() => r(null)));
      await new Promise(r => setTimeout(r, 150));

      /** Hide footer chrome under the action bar with visibility:hidden; display:none would reflow the reply composer into the clip. */
      try {
        let barBottom = 0;
        for (const b of article.querySelectorAll('[data-testid="reply"],[data-testid="retweet"],[data-testid="unretweet"],[data-testid="like"],[data-testid="unlike"],[data-testid="bookmark"]')) {
          if (b.closest('article') === article) barBottom = Math.max(barBottom, b.getBoundingClientRect().bottom);
        }
        if (barBottom === 0) {
          const g = Array.from(article.querySelectorAll('[role="group"]'))
            .filter((x) => x.closest('article') === article)
            .find((x) => x.querySelector('[data-testid="reply"], [data-testid="like"], [data-testid="retweet"], [data-testid="unretweet"], [data-testid="unlike"]'));
          if (g) barBottom = g.getBoundingClientRect().bottom;
        }
        if (barBottom > 0) {
          const walker = document.createTreeWalker(article, NodeFilter.SHOW_ELEMENT);
          let node;
          while ((node = walker.nextNode())) {
            if (node.querySelector('[data-testid="reply"], [data-testid="like"], [data-testid="retweet"], [data-testid="unretweet"], [data-testid="unlike"], [data-testid="bookmark"]')) continue;
            const nr = node.getBoundingClientRect();
            if (nr.width > 0 && nr.height > 0 && nr.top >= barBottom - 1) {
              node.style.setProperty('visibility', 'hidden', 'important');
            }
          }
        }
      } catch (_) {}

      const r = article.getBoundingClientRect();

      /** The raw article box includes the thread spine and footer chrome; derive a tight box from the tweet's own content, with the bottom at the action bar. */
      const inner = Array.from(article.querySelectorAll('article'))
        .find((a) => a !== article);
      const focal = (el) => !!el && el.closest('article') === article;
      const rects = [];
      const add = (el) => { if (focal(el)) rects.push(el.getBoundingClientRect()); };
      add(article.querySelector('[data-testid^="UserAvatar-Container"]'));
      add(article.querySelector('[data-testid="User-Name"]'));
      for (const sel of ['[data-testid="tweetText"]','[data-testid="tweetPhoto"]','[data-testid="card.wrapper"]','[data-testid="videoPlayer"]','[data-testid="videoComponent"]','video']) {
        for (const el of article.querySelectorAll(sel)) add(el);
      }
      if (inner) rects.push(inner.getBoundingClientRect());

      let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
      if (rects.length) {
        left = Math.max(r.left, Math.min(...rects.map((b) => b.left)));
        top = Math.max(r.top, Math.min(...rects.map((b) => b.top)));
        right = Math.min(r.right, Math.max(...rects.map((b) => b.right)));
      }

      /** Bottom edge: action-bar buttons, then their role="group" wrapper, then the content union, finally the article rect; each fallback is content-safe. */
      let actionBottom = 0;
      for (const b of article.querySelectorAll('[data-testid="reply"],[data-testid="retweet"],[data-testid="unretweet"],[data-testid="like"],[data-testid="unlike"],[data-testid="bookmark"]')) {
        if (focal(b)) actionBottom = Math.max(actionBottom, b.getBoundingClientRect().bottom);
      }
      if (actionBottom === 0) {
        const group = Array.from(article.querySelectorAll('[role="group"]'))
          .filter((g) => g.closest('article') === article)
          .find((g) => g.querySelector('[data-testid="reply"], [data-testid="like"], [data-testid="retweet"], [data-testid="unretweet"], [data-testid="unlike"]'));
        if (group) actionBottom = group.getBoundingClientRect().bottom;
      }
      if (actionBottom > top && actionBottom <= r.bottom) {
        bottom = actionBottom + 6;
      } else if (rects.length) {
        bottom = Math.max(...rects.map((b) => b.bottom));
      }

      /** Discover the quoted tweet (the inline nested <article>) so the caller can walk the quote chain by navigating to it. */
      let quotedUrl;
      try {
        const link = inner && inner.querySelector('a[href*="/status/"]');
        if (link) {
          const u = new URL(link.href, 'https://x.com');
          const m = u.pathname.match(/\\/status\\/(\\d+)/);
          if (m) quotedUrl = 'https://x.com' + u.pathname;
        }
      } catch (_) {}

      return {
        x: left,
        y: top,
        width: Math.max(8, right - left),
        height: Math.max(8, bottom - top),
        ...(quotedUrl ? { quotedUrl } : {}),
      };
    } catch (_) {
      return null;
    }
  })()`;
}

export function buildThreadsPostRectExpression(code: string): string {
  return `(async () => {
    try {
      const code = ${JSON.stringify(code)};
      const findCard = () => {
        const anchor = document.querySelector('a[href*="/post/' + code + '"]');
        return anchor && (anchor.closest('[data-pressable-container], [role="article"], article') || anchor.parentElement);
      };
      const deadline = Date.now() + 10_000;
      let card = findCard();
      while (!card && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 200));
        card = findCard();
      }
      if (!card) return null;

      try {
        const siblings = document.querySelectorAll('[data-pressable-container], [role="article"], article');
        for (const s of siblings) {
          if (s !== card && !card.contains(s) && !s.contains(card)) {
            s.style.setProperty('display', 'none', 'important');
          }
        }
      } catch (_) {}

      window.scrollTo(0, 0);
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
      await new Promise(r => requestAnimationFrame(() => r(null)));
      await new Promise(r => setTimeout(r, 150));

      const r = card.getBoundingClientRect();
      let quotedUrl;
      try {
        for (const link of card.querySelectorAll('a[href*="/post/"]')) {
          const u = new URL(link.href, 'https://www.threads.com');
          const m = u.pathname.match(/\\/post\\/([A-Za-z0-9_-]+)/);
          if (m && m[1] !== code) {
            quotedUrl = 'https://www.threads.com' + u.pathname;
            break;
          }
        }
      } catch (_) {}

      return {
        x: r.left,
        y: r.top,
        width: Math.max(8, r.width),
        height: Math.max(8, r.height),
        ...(quotedUrl ? { quotedUrl } : {}),
      };
    } catch (_) {
      return null;
    }
  })()`;
}
