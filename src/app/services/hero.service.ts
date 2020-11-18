import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import {
    debounceTime,
    distinctUntilChanged,
    map,
    pluck,
    share,
    switchMap,
} from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Hero {
    id: number;
    name: string;
    description: string;
    thumbnail: HeroThumbnail;
    resourceURI: string;
    comics: HeroSubItems;
    events: HeroSubItems;
    series: HeroSubItems;
    stories: HeroSubItems;
}

export interface HeroThumbnail {
    path: string;
    extendion: string;
}

export interface HeroSubItems {
    available: number;
    returned: number;
    collectionURI: string;
    items: HeroSubItem[];
}

export interface HeroSubItem {
    resourceURI: string;
    name: string;
}

// The URL to the Marvel API
const HERO_API = `${environment.MARVEL_API.URL}/v1/public/characters`;

// Our Limits for Search
const LIMIT_LOW = 10;
const LIMIT_MID = 25;
const LIMIT_HIGH = 100;
const LIMITS = [LIMIT_LOW, LIMIT_MID, LIMIT_HIGH];

const DEFAULT_STATE = {
    search: '',
    limit: LIMIT_LOW,
    page: 0,
};
@Injectable({
    providedIn: 'root',
})
export class HeroService {
    limits = LIMITS;

    private heroState = new BehaviorSubject(DEFAULT_STATE);
    search$ = this.heroState.pipe(pluck('search'));
    page$ = this.heroState.pipe(pluck('page'));
    userPage$ = this.page$.pipe(map(page => page + 1));
    limit$ = this.heroState.pipe(pluck('limit'));

    heroesResponse$ = this.heroState.pipe(
        debounceTime(500),
        distinctUntilChanged(
            (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
        switchMap(state => {
            const params: any = {
                apikey: environment.MARVEL_API.PUBLIC_KEY,
                limit: `${state.limit}`,
                offset: `${state.page * state.limit}`, // page * limit
            };
            if (state.search && state.search.length) {
                params.nameStartsWith = state.search;
            }
            return this.http.get(HERO_API, { params });
        }),
        share(),
    );

    heroes$ = this.heroesResponse$.pipe(map((res: any) => res.data.results));
    total$ = this.heroesResponse$.pipe(map((res: any) => res.data.total));
    totalPages$ = combineLatest([this.total$, this.limit$]).pipe(
        map(values => Math.ceil(values[0] / values[1])),
    );

    setSearch(search: string) {
        const currentState = this.heroState.getValue();
        this.heroState.next({
            ...currentState,
            search,
            page: 0,
        });
    }

    movePage(moveBy: number) {
        const currentState = this.heroState.getValue();
        this.heroState.next({
            ...currentState,
            page: currentState.page + moveBy,
        });
    }

    setLimit(limit: number) {
        const currentState = this.heroState.getValue();
        this.heroState.next({
            ...currentState,
            limit,
            page: 0,
        });
    }

    constructor(private http: HttpClient) {}
}
