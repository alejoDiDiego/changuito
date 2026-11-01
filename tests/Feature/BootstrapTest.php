<?php

use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

it('serves the neutral bootstrap via Inertia without private props', function () {
    $this->withoutVite();
    // HTTP props contract only; real SSR is mandatory in Playwright's no-JS test.
    config(['inertia.ssr.enabled' => false]);
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Bootstrap')->where('screen', 'inicio')->missing('auth')->missing('tenant'));
});
it('uses real isolated PostgreSQL and rolls back transactional writes', function () {
    expect(DB::selectOne('select current_database() as db, current_user as role')->db)->toBe('changuito_test');
    expect(DB::selectOne('select current_user as role')->role)->toBe('changuito_test');
    DB::beginTransaction();
    DB::statement('create temporary table bootstrap_probe (id integer primary key)');
    DB::insert('insert into bootstrap_probe values (1)');
    expect(DB::selectOne('select count(*) as total from bootstrap_probe')->total)->toBe(1);
    DB::rollBack();
    expect(DB::selectOne("select to_regclass('pg_temp.bootstrap_probe') as relation")->relation)->toBeNull();
});
