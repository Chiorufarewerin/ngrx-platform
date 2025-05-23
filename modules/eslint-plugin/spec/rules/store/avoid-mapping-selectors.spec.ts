import type { ESLintUtils } from '@typescript-eslint/utils';
import type {
  InvalidTestCase,
  ValidTestCase,
} from '@typescript-eslint/rule-tester';
import * as path from 'path';
import rule, {
  messageId,
} from '../../../src/rules/store/avoid-mapping-selectors';
import { ruleTester, fromFixture } from '../../utils';

type MessageIds = ESLintUtils.InferMessageIdsTypeFromRule<typeof rule>;
type Options = ESLintUtils.InferOptionsTypeFromRule<typeof rule>;

const valid: () => (string | ValidTestCase<Options>)[] = () => [
  `
import { Store } from '@ngrx/store'

class Ok {
  readonly test$ = somethingOutside();
}`,
  `
import { Store } from '@ngrx/store'

class Ok1 {
  foo$ = this.store.select(selectItems)

  constructor(private store: Store) {}
}`,
  `
import { Store } from '@ngrx/store'

class Ok2 {
  foo$ = this.store.select(selectItems).pipe(filter(x => !!x))

  constructor(private store: Store) {}
}`,
  `
import { Store } from '@ngrx/store'

class Ok3 {
  foo$ = this.store.pipe(select(selectItems))

  constructor(private store: Store) {}
}`,
  `
import { Store } from '@ngrx/store'

class Ok4 {
  foo$ = this.store.pipe(select(selectItems)).pipe(filter(x => !!x))

  constructor(private store: Store) {}
}`,
  `
import { Store } from '@ngrx/store'

class Ok5 {
  loginUserSuccess$ = createEffect(() => {
      return this.actions$.pipe(
        ofType(AuthActions.loginUserSuccess),
        concatLatestFrom(action => this.store.select(startUrl)),
        map(([action, url]) => AuthActions.setStartUrl({ data: '' })),
      )
    }
  )

  constructor(private store: Store) {}
}`,
  // https://github.com/timdeschryver/eslint-plugin-ngrx/issues/174
  `
import { Store } from '@ngrx/store'

class Ok6 {
  loginUserSuccess$ = combineLatest([
    this.store.select(selectAuthorizations), this.hasAuthorization$
  ]).pipe(map((val) => !isEmpty(intersection(val))))

  constructor(private store: Store) {}
}`,
  `
import { Store } from '@ngrx/store'

class Ok7 {
  readonly customers$ = this.store$.select(({ customers }) => customers).pipe()
  readonly users$ = this.store$
    .select('users')
    .pipe(switchMap(() => of(items.map(parseItem))))

  constructor(private readonly store$: Store) {}

  ngOnInit() {
    this.store$.pipe()
  }
}
`,
  // https://github.com/timdeschryver/eslint-plugin-ngrx/issues/282
  `
import { Store } from '@ngrx/store'

export class CollectionService {

  constructor(
    private service: Service,
    private store: Store
  ) {
  }

  getEntities$(): Observable<Entity[]> {
    return this.store.select(selectUser).pipe(
      switchMap(user => this.service.getCollection(user).pipe(
        map(transformCollection)
      )),
    );
  }
}
`,
  // https://github.com/timdeschryver/eslint-plugin-ngrx/issues/285
  `
import { Store } from '@ngrx/store'

class OkBecauseOfThis {
  storeSelect$ = this.store.select(selectIsAuthenticated).pipe(
      take(1),
      map((isAuthenticated: boolean) => (isAuthenticated ? true : this.router.parseUrl('/login'))),
  )

  pipeSelect$ = this.store.pipe(
      select(selectIsAuthenticated),
      take(1),
      map((isAuthenticated: boolean) => (isAuthenticated ? true : this.router.parseUrl('/login'))),
  )

  constructor(private store: Store) {}
}`,
  `
import { Store } from '@ngrx/store'

class OkBecauseOfEffect {
  storeSelect$ = createEffect(() => {
    return this.store.select(selectObj).pipe(
      map((obj) => obj.prop),
      distinctUntilChanged(),
      map(() => anAction())
    )
  })

  pipeSelect$ = createEffect(() => {
    return this.store.pipe(
      select(selectObj),
      map((obj) => obj.prop),
      distinctUntilChanged(),
      map(() => anAction())
    )
  })

  constructor(private store: Store) {}
}`,
  // https://github.com/ngrx/platform/issues/3511
  `
import { Store } from '@ngrx/store'

class OkBecauseOfEffect {
  storeSelect$ = createEffect(() => {
    return this.store.select(selectObj).pipe(
      switchMap(() => this.service.something()),
      map((obj) => obj.prop),
    )
  })

  pipeSelect$ = createEffect(() => {
    return this.store.pipe(
      select(selectObj),
      exhaustMap(() => this.service.something()),
      map((obj) => obj.prop),
    )
  })

  somethingElse$ = createEffect(() => {
    return this.store.pipe(
      select(selectObj),
      customOperator(() => this.prop),
      map((obj) => obj.prop),
    )
  })

  constructor(private store: Store, private service: Service) {}
}`,
];

const invalid: () => InvalidTestCase<MessageIds, Options>[] = () => [
  fromFixture(`
import { Store } from '@ngrx/store'

class NotOk {
  vm$ = this.store
    .select(selectItems)
    .pipe(map((item) => item.select()))
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ [${messageId}]

  constructor(private store: Store) {}
}
`),
  fromFixture(`
import { Store } from '@ngrx/store'

class NotOk1 {
  vm$ = this.customStore.select(selectItems).pipe(
    filter((x) => !!x),
    map(getName),
    ~~~~~~~~~~~~ [${messageId}]
  )

  constructor(private customStore: Store) {}
}
`),
  fromFixture(`
import { Store } from '@ngrx/store'

class NotOk2 {
  readonly vm$ = this.store.pipe(
    select(selectItems),
    map((item) => ({ name: item.name, ...item.pipe() })),
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ [${messageId}]
  )

  constructor(private readonly store: Store) {}
}
`),
  fromFixture(`
import { Store } from '@ngrx/store'

class NotOk3 {
  readonly test$: Observable<unknown>
  readonly vm$: Observable<Name>

  constructor(store$: Store, private readonly store: Store) {
    this.vm$ = store$.pipe(
      select(selectItems),
      filter(Boolean),
      map(({ name }) => ({ name })),
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ [${messageId}]
    )
  }

  buildSomething() {
    this.test$ = this.store
    .select(selectItems)
    .pipe(map((item) => item.select()))
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ [${messageId}]
  }
}
`),
];

ruleTester().run(path.parse(__filename).name, rule, {
  valid: valid(),
  invalid: invalid(),
});
