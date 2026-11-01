<?php

arch('bootstrap support is final and has no HTTP dependency')->expect('App\Support')->toBeFinal()->not->toUse(['Illuminate\Http', 'Inertia']);
arch('production code never uses debug termination')->expect('App')->not->toUse(['dd', 'dump', 'die', 'exit']);
