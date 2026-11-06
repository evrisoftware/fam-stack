import {inject} from '@angular/core';
import {IsActiveMatchOptions, Router, ViewTransitionsFeatureOptions} from '@angular/router';

/** Navigation `info` that skips the view transition: `navigateByUrl(url, {info: QUIET_NAVIGATION})`. */
export const QUIET_NAVIGATION = 'fam-quiet-navigation';

const SAME_PAGE: IsActiveMatchOptions =
  {paths: 'exact', matrixParams: 'exact', queryParams: 'ignored', fragment: 'ignored'};

/**
 * Options for `withViewTransitions(...)`: skips the transition on first load, for a
 * `QUIET_NAVIGATION`, and for a navigation to the page already shown. The animation is
 * in the base styles (`view-transition-name: fam-page`).
 */
export const famViewTransitions = (): ViewTransitionsFeatureOptions => ({
  skipInitialTransition: true,
  onViewTransitionCreated: ({transition}) => {
    const router = inject(Router);
    const navigation = router.currentNavigation();
    if (navigation?.extras.info === QUIET_NAVIGATION) {
      transition.skipTransition();
      return;
    }
    const target = navigation?.finalUrl;
    if (target && router.isActive(target, SAME_PAGE)) transition.skipTransition();
  }
});
