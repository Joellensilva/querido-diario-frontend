import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Moment } from 'moment';
import { Observable, of, Subscription } from 'rxjs';
import { map, startWith, switchMap, take } from 'rxjs/operators';
import { City } from 'src/app/interfaces/city';
import { TerritoryService } from 'src/app/services/territory/territory.service';

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.sass'],
})
export class SearchFormComponent implements OnInit {
  termControl = new FormControl();

  @Input()
  form: any;

  options: string[] = [
    'Compra emergencial COVID-19',
    'Dispensa de licitação',
    'Contratação',
    'Nomeação',
    'Saneamento básico',
  ];

  filteredOptions: Observable<string[]> = new Observable();

  cityControl = new FormControl();
  territories: Observable<City[]> = of([]);

  @ViewChild('cityField') cityField!: ElementRef;
  @ViewChild('termField') termField!: ElementRef;
  @ViewChild('periodField') periodField!: ElementRef;

  published_since: string = '';
  published_until: string = '';

  territory: City | null = null;

  subscriptions: Subscription[] = [];

  constructor(
    private territoryService: TerritoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.filteredOptions = this.termControl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterTerms(value))
    );

    this.territories = this.cityControl.valueChanges.pipe(
      startWith(''),
      switchMap((value) => {
        if (value !== '') {
          return this.findTerritory(value);
        } else {
          return of([]);
        }
      })
    );

    this.subscriptions.push(
      this.route.queryParams.subscribe((params) => {
        const { term, city } = params;
        this.termControl.setValue(term);
        if (city) {
          this.territoryService
            .findOne({ territoryId: city })
            .pipe(take(1))
            .subscribe((res) => {
              this.cityControl.setValue(res);
            });
        }
      })
    );
  }

  search(): void {
    let queryParams = {};
    const term = this.termField.nativeElement.value;
    const cityName = this.cityField.nativeElement.value;

    if (this.territory && cityName) {
      queryParams = { ...queryParams, city: this.territory.territory_id };
    } else {
      queryParams = { ...queryParams, city: null };
    }

    if (term) {
      queryParams = { ...queryParams, term };
    } else {
      queryParams = { ...queryParams, term: null };
    }

    if (this.published_since && this.published_until) {
      queryParams = { ...queryParams, published_since: this.published_since, published_until: this.published_until };
    } else {
      queryParams = { ...queryParams, published_since: null, published_until: null };
    }

    this.router.navigate(['/pesquisa'], { queryParams });
  }

  onRangeSelected(range: { start: Moment; end: Moment }) {
    if (range.start) {
      this.published_since = range.start.format('YYYY-MM-DD');
    }
    if (range.end) {
      this.published_until = range.end.format('YYYY-MM-DD');
    }
  }

  private _filterTerms(value: string): string[] {
    if (!value) {
      return [];
    }
    const filterValue = value.toLowerCase();

    return this.options.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  displayFn(territory: City): string {
    return territory && territory.territory_label
      ? territory.territory_label
      : '';
  }

  private findTerritory(value: any): Observable<City[]> {
    if (!value) {
      this.territory = null;
      return of([]);
    }
    if (typeof value === 'string') {
      if (value.length <= 1) {
        return of([]);
      }
      const filterValue = value.toLowerCase();
      return this.territoryService
        .findByName(filterValue)
        .pipe(map((result) => result));
    } else {
      const filterValue = value.territory_name.toLowerCase();
      this.territory = value;
      return this.territoryService
        .findByName(filterValue)
        .pipe(map((result) => result));
    }
  }

  ngOnDestroy() {
    for (let subscriptions of this.subscriptions) {
      subscriptions.unsubscribe();
    }
  }
}

