(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function debounce(fn, wait) {
    var timeout;
    return function () {
      var context = this;
      var args = arguments;
      window.clearTimeout(timeout);
      timeout = window.setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  function initLoader() {
    var loader = qs("[data-loader]");
    if (!loader) {
      return;
    }

    var hideLoader = function () {
      window.setTimeout(function () {
        loader.classList.add("is-hidden");
      }, 280);
    };

    if (document.readyState === "complete") {
      hideLoader();
    } else {
      window.addEventListener("load", hideLoader, { once: true });
      window.setTimeout(hideLoader, 1800);
    }
  }

  function initHeader() {
    var header = qs("[data-header]");
    var nav = qs("[data-nav]");
    var toggle = qs("[data-nav-toggle]");
    var page = document.body.dataset.page;

    if (!header) {
      return;
    }

    var updateHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    qsa("[data-nav-link]").forEach(function (link) {
      if (link.dataset.navLink === page) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });

    if (!nav || !toggle) {
      return;
    }

    var setMenuOpen = function (isOpen) {
      nav.classList.toggle("is-open", isOpen);
      toggle.classList.toggle("is-active", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
      document.body.classList.toggle("nav-open", isOpen);
    };

    toggle.addEventListener("click", function () {
      setMenuOpen(!nav.classList.contains("is-open"));
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open") || nav.contains(event.target) || toggle.contains(event.target)) {
        return;
      }
      setMenuOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setMenuOpen(false);
      }
    });

    window.addEventListener("resize", debounce(function () {
      if (window.innerWidth > 900) {
        setMenuOpen(false);
      }
    }, 160));
  }

  function initReveal() {
    var revealItems = qsa("[data-reveal]");
    if (!revealItems.length || prefersReducedMotion) {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.16,
      rootMargin: "0px 0px -70px 0px"
    });

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  }

  function initCounters() {
    var counters = qsa("[data-counter]");
    if (!counters.length) {
      return;
    }

    var animateCounter = function (counter) {
      var target = Number(counter.dataset.counter || 0);
      var duration = prefersReducedMotion ? 1 : 1300;
      var start = performance.now();

      var tick = function (now) {
        var progress = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = String(Math.round(target * eased));

        if (progress < 1) {
          window.requestAnimationFrame(tick);
        }
      };

      window.requestAnimationFrame(tick);
    };

    if (prefersReducedMotion) {
      counters.forEach(function (counter) {
        counter.textContent = counter.dataset.counter;
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (counter) {
      observer.observe(counter);
    });
  }

  function initCarousels() {
    qsa("[data-carousel]").forEach(function (carousel) {
      var track = qs(".carousel-track", carousel);
      var slides = qsa(".carousel-slide", carousel);
      var prev = qs("[data-carousel-prev]", carousel);
      var next = qs("[data-carousel-next]", carousel);
      var dotsWrap = qs("[data-carousel-dots]", carousel);
      var autoPlay = carousel.dataset.autoplay === "true" && !prefersReducedMotion;
      var index = 0;
      var maxIndex = 0;
      var intervalId = null;
      var startX = 0;
      var currentX = 0;
      var isDragging = false;

      if (!track || !slides.length) {
        return;
      }

      function getGap() {
        var styles = window.getComputedStyle(track);
        return parseFloat(styles.columnGap || styles.gap || "0") || 0;
      }

      function getStep() {
        return slides[0].getBoundingClientRect().width + getGap();
      }

      function calculateMaxIndex() {
        var step = getStep();
        var visible = Math.max(1, Math.floor((carousel.clientWidth + getGap()) / step));
        maxIndex = Math.max(0, slides.length - visible);
        index = Math.min(index, maxIndex);
      }

      function buildDots() {
        if (!dotsWrap) {
          return;
        }

        dotsWrap.innerHTML = "";
        for (var i = 0; i <= maxIndex; i += 1) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.setAttribute("aria-label", "Go to slide " + (i + 1));
          dot.dataset.index = String(i);
          dotsWrap.appendChild(dot);
        }
      }

      function updateDots() {
        if (!dotsWrap) {
          return;
        }

        qsa("button", dotsWrap).forEach(function (dot, dotIndex) {
          dot.classList.toggle("is-active", dotIndex === index);
        });
      }

      function goTo(nextIndex) {
        if (nextIndex < 0) {
          index = maxIndex;
        } else if (nextIndex > maxIndex) {
          index = 0;
        } else {
          index = nextIndex;
        }

        track.style.transform = "translateX(-" + (index * getStep()) + "px)";
        updateDots();
      }

      function refresh() {
        calculateMaxIndex();
        buildDots();
        goTo(index);
      }

      function startAuto() {
        if (!autoPlay || intervalId || maxIndex === 0) {
          return;
        }

        intervalId = window.setInterval(function () {
          goTo(index + 1);
        }, 4200);
      }

      function stopAuto() {
        if (intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }

      if (prev) {
        prev.addEventListener("click", function () {
          stopAuto();
          goTo(index - 1);
          startAuto();
        });
      }

      if (next) {
        next.addEventListener("click", function () {
          stopAuto();
          goTo(index + 1);
          startAuto();
        });
      }

      if (dotsWrap) {
        dotsWrap.addEventListener("click", function (event) {
          var dot = event.target.closest("button");
          if (!dot) {
            return;
          }

          stopAuto();
          goTo(Number(dot.dataset.index));
          startAuto();
        });
      }

      carousel.addEventListener("pointerdown", function (event) {
        isDragging = true;
        startX = event.clientX;
        currentX = startX;
        stopAuto();
      });

      carousel.addEventListener("pointermove", function (event) {
        if (!isDragging) {
          return;
        }
        currentX = event.clientX;
      });

      carousel.addEventListener("pointerup", function () {
        if (!isDragging) {
          return;
        }

        var distance = currentX - startX;
        if (Math.abs(distance) > 46) {
          goTo(distance < 0 ? index + 1 : index - 1);
        }
        isDragging = false;
        startAuto();
      });

      carousel.addEventListener("pointercancel", function () {
        isDragging = false;
        startAuto();
      });

      carousel.addEventListener("mouseenter", stopAuto);
      carousel.addEventListener("mouseleave", startAuto);
      carousel.addEventListener("focusin", stopAuto);
      carousel.addEventListener("focusout", startAuto);
      window.addEventListener("resize", debounce(refresh, 180));

      refresh();
      startAuto();
    });
  }

  function initFilters() {
    var tabGroups = qsa("[data-filter-tabs]");

    tabGroups.forEach(function (group) {
      var grid = qs("[data-product-grid]");
      var cards = grid ? qsa("[data-category]", grid) : [];

      group.addEventListener("click", function (event) {
        var button = event.target.closest("[data-filter]");
        if (!button) {
          return;
        }

        var filter = button.dataset.filter;
        qsa("[data-filter]", group).forEach(function (item) {
          item.classList.toggle("is-active", item === button);
        });

        cards.forEach(function (card) {
          var shouldShow = filter === "all" || card.dataset.category === filter;
          card.classList.toggle("is-hidden", !shouldShow);
        });
      });
    });
  }

  function initProductModal() {
    var modal = qs("[data-product-modal]");
    if (!modal) {
      return;
    }

    var modalImage = qs("[data-modal-image]", modal);
    var modalCategory = qs("[data-modal-category]", modal);
    var modalTitle = qs("[data-modal-title]", modal);
    var modalDetail = qs("[data-modal-detail]", modal);
    var modalPrice = qs("[data-modal-price]", modal);
    var close = qs("[data-modal-close]", modal);

    qsa("[data-modal-open]").forEach(function (button) {
      button.addEventListener("click", function () {
        var card = button.closest("[data-name]");

        if (!card) {
          return;
        }

        var image = qs("img", card);

        modalImage.src = image ? image.src : "";
        modalImage.alt = image ? image.alt : "";
        modalCategory.textContent = card.dataset.category || "Product";
        modalTitle.textContent = card.dataset.name || "";
        modalDetail.textContent = card.dataset.detail || "";
        modalPrice.textContent = card.dataset.price || "";

        if (typeof modal.showModal === "function") {
          modal.showModal();
        } else {
          modal.setAttribute("open", "");
        }
      });
    });

    function closeModal() {
      if (typeof modal.close === "function") {
        modal.close();
      } else {
        modal.removeAttribute("open");
      }
    }

    if (close) {
      close.addEventListener("click", closeModal);
    }

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal.hasAttribute("open")) {
        closeModal();
      }
    });
  }

  function initAccordions() {
    qsa("[data-accordion]").forEach(function (accordion) {
      accordion.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button) {
          return;
        }

        var item = button.closest(".faq-item");
        var panel = qs(".faq-panel", item);
        var isOpen = item.classList.toggle("is-open");

        button.setAttribute("aria-expanded", String(isOpen));
        panel.style.maxHeight = isOpen ? panel.scrollHeight + "px" : "0px";
      });
    });
  }

  function initFields() {
    qsa(".field-group input, .field-group select, .field-group textarea").forEach(function (field) {
      var group = field.closest(".field-group");

      function updateFilled() {
        group.classList.toggle("is-filled", Boolean(field.value));
      }

      field.addEventListener("input", updateFilled);
      field.addEventListener("change", updateFilled);
      updateFilled();
    });
  }

  function setFieldError(field, message) {
    var group = field.closest(".field-group");
    var error = qs("small", group);
    group.classList.toggle("has-error", Boolean(message));
    if (error) {
      error.textContent = message || "";
    }
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function initContactForm() {
    var form = qs("[data-contact-form]");
    if (!form) {
      return;
    }

    var message = qs("[data-contact-message]", form);

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var fields = {
        name: qs("#name", form),
        email: qs("#email", form),
        phone: qs("#phone", form),
        occasion: qs("#occasion", form),
        message: qs("#message", form)
      };
      var valid = true;

      Object.keys(fields).forEach(function (key) {
        setFieldError(fields[key], "");
      });

      if (!fields.name.value.trim()) {
        setFieldError(fields.name, "Please enter your name.");
        valid = false;
      }

      if (!isEmail(fields.email.value.trim())) {
        setFieldError(fields.email, "Please enter a valid email address.");
        valid = false;
      }

      if (fields.phone.value.replace(/\D/g, "").length < 7) {
        setFieldError(fields.phone, "Please enter a valid phone number.");
        valid = false;
      }

      if (!fields.occasion.value) {
        setFieldError(fields.occasion, "Please choose an occasion type.");
        valid = false;
      }

      if (fields.message.value.trim().length < 10) {
        setFieldError(fields.message, "Please add a few details about your order.");
        valid = false;
      }

      if (!valid) {
        if (message) {
          message.textContent = "Please fix the highlighted fields.";
        }
        return;
      }

      if (message) {
        message.textContent = "Thank you. Your inquiry is ready to be connected to a backend or WhatsApp flow.";
      }
      form.reset();
      qsa(".field-group", form).forEach(function (group) {
        group.classList.remove("is-filled", "has-error");
        var error = qs("small", group);
        if (error) {
          error.textContent = "";
        }
      });
    });
  }

  function initNewsletterForms() {
    qsa("[data-newsletter]").forEach(function (form) {
      var input = qs("input[type='email']", form);
      var message = qs("[data-newsletter-message]", form);

      form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!input || !isEmail(input.value.trim())) {
          if (message) {
            message.textContent = "Enter a valid email address.";
          }
          return;
        }

        if (message) {
          message.textContent = "Thank you for joining The ChocoCraze list.";
        }
        form.reset();
      });
    });
  }

  function initBackToTop() {
    var button = qs("[data-back-to-top]");
    if (!button) {
      return;
    }

    var update = function () {
      button.classList.toggle("is-visible", window.scrollY > 620);
    };

    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initParallax() {
    var sections = qsa("[data-parallax-section]");
    if (!sections.length || prefersReducedMotion) {
      return;
    }

    var ticking = false;

    function update() {
      sections.forEach(function (section) {
        var rect = section.getBoundingClientRect();
        var offset = rect.top * -0.08;
        section.style.backgroundPosition = "center calc(50% + " + offset.toFixed(1) + "px)";
      });
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  function initPageTransitions() {
    if (prefersReducedMotion) {
      return;
    }

    qsa("a[href]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        var href = link.getAttribute("href");

        if (!href || href.charAt(0) === "#" || link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        var url = new URL(href, window.location.href);
        var current = new URL(window.location.href);
        var isExternal = url.origin !== current.origin;
        var isSamePageHash = url.pathname === current.pathname && url.hash;

        if (isExternal || isSamePageHash || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) {
          return;
        }

        event.preventDefault();
        document.body.classList.add("is-leaving");
        window.setTimeout(function () {
          window.location.href = url.href;
        }, 180);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLoader();
    initHeader();
    initReveal();
    initCounters();
    initCarousels();
    initFilters();
    initProductModal();
    initAccordions();
    initFields();
    initContactForm();
    initNewsletterForms();
    initBackToTop();
    initParallax();
    initPageTransitions();
  });
}());
