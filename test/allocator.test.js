/*
 * Copyright (c) 2012, Joyent, Inc. All rights reserved.
 */

var Allocator = require('../lib/allocator.js');

var logStub = { trace: function () { return true; },
                debug: function () { return true; },
                info:  function () { return true; },
                error: function (err) { console.log(err); return true; } };



exports.algorithms_pipeline =
function (t) {
    var serverStubs = [1, 2, 3, 4, 5];
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function (log, state, servers) {
                t.ok(log.debug);
                t.deepEqual(state, {});
                t.deepEqual(servers, serverStubs);

                executed.push(1);
                return [5, 4, 3, 2];
            }
        }, {
            name: 'bar',
            run: function (log, state, servers) {
                t.ok(log.debug);
                t.deepEqual(state, {});
                t.deepEqual(servers, [5, 4, 3, 2]);

                state.bar = [42];
                executed.push(2);
                return [2, 3];
            },
            post: function (log, state, server, servers) {
                t.ok(log.debug);
                t.deepEqual(state, { bar: [42] });
                t.equal(server, 3);
                t.deepEqual(servers, serverStubs);

                state.bar.push(24);
                executed.push(3);
            }
        }, {
            name: 'baz',
            run: function (log, state, servers) {
                t.ok(log.debug);
                t.deepEqual(state, {});
                t.deepEqual(servers, [2, 3]);

                state.bar = 'hi';
                state.baz = {};
                executed.push(4);
                return [3];
            }
        }
    ];

    var allocator = new Allocator(logStub);
    allocator.expression = plugins;

    var serverStub = allocator.allocate(serverStubs, {});
    t.equal(serverStub, 3);
    t.deepEqual(executed, [1, 2, 4, 3]);

    t.done();
};



// assumes state from algorithms_pipeline() test
exports.algorithms_state_retained =
function (t) {
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function (log, state, servers) {
                t.deepEqual(state, {});
                executed.push(1);
                return [1];
            }
        }, {
            name: 'bar',
            run: function (log, state, servers) {
                t.deepEqual(state, { bar: [42, 24] });
                executed.push(2);
                return [1];
            }
        }, {
            name: 'baz',
            run: function (log, state, servers) {
                t.deepEqual(state, { bar: 'hi', baz: {} });
                executed.push(3);
                return [1];
            }
        }
    ];

    var allocator = new Allocator(logStub);
    allocator.expression = plugins;

    var serverStub = allocator.allocate([1], {});
    t.equal(serverStub, 1);
    t.deepEqual(executed, [1, 2, 3]);

    t.done();
};



exports.algorithms_shortcuts_with_no_servers =
function (t) {
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function () {
                executed.push(1);
                return [1];
            },
            post: function (log, state, server) {
                t.equal(server, undefined);
                executed.push(2);
            }
        }, {
            name: 'bar',
            run: function () {
                executed.push(3);
                return [1];
            },
            post: function (log, state, server) {
                t.equal(server, undefined);
                executed.push(4);
            }
        }, {
            name: 'baz',
            run: function () {
                executed.push(5);
                return [];
            },
            post: function (log, state, server) {
                t.equal(server, undefined);
                executed.push(6);
            }
        }, {
            name: 'baz',
            run: function () {
                executed.push(7);
                return [];
            },
            post: function () {
                executed.push(8);
            }
        }
    ];

    var allocator = new Allocator(logStub);
    allocator.expression = plugins;

    var serverStub = allocator.allocate([1], {});
    t.equal(serverStub, undefined);
    t.deepEqual(executed, [1, 3, 5, 6, 4, 2]);

    t.done();
};



exports.test_dispatch_1 =
function (t) {
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function (log, state, servers) {
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(1);
                return [1, 3, 4];
            }
        },
        [
            'or',
            {
                name: 'bar',
                run: function (log, state, servers) {
                    t.deepEqual(servers, [1, 3, 4]);
                    executed.push(2);
                    return [];
                }
            }, {
                name: 'baz',
                run: function (log, state, servers) {
                    t.deepEqual(servers, [1, 3, 4]);
                    executed.push(3);
                    return [1];
                }
            }
        ]
    ];

    var allocator = new Allocator(logStub);
    allocator.expression = plugins;

    var serverStub = allocator.allocate([1, 2, 3, 4], {});
    t.equal(serverStub, 1);
    t.deepEqual(executed, [1, 2, 3]);

    t.done();
};



exports.test_dispatch_2 =
function (t) {
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function (log, state, servers) {
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(1);
                return [1, 3, 4];
            }
        },
        [
            'or',
            {
                name: 'bar',
                run: function (log, state, servers) {
                    t.deepEqual(servers, [1, 3, 4]);
                    executed.push(2);
                    return [1];
                }
            }, {
                name: 'baz',
                run: function (log, state, servers) {
                    t.ok(false);
                }
            }
        ]
    ];

    var allocator = new Allocator(logStub);
    allocator.expression = plugins;

    var serverStub = allocator.allocate([1, 2, 3, 4], {});
    t.equal(serverStub, 1);
    t.deepEqual(executed, [1, 2]);

    t.done();
};



exports.test_dispatch_3 =
function (t) {
    var executed = [];

    var plugins = [
        'pipe',
        {
            name: 'foo',
            run: function (log, state, servers) {
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(1);
                return [];
            }
        },
        [
            'or',
            {
                name: 'bar',
                run: function (log, state, servers) {
                    t.ok(false);
                }
            }, {
                name: 'baz',
                run: function (log, state, servers) {
                    t.ok(false);
                }
            }
        ]
    ];

    var allocator = new Allocator(logStub);
    allocator.expression = plugins;

    var serverStub = allocator.allocate([1, 2, 3, 4], {});
    t.equal(serverStub, undefined);
    t.deepEqual(executed, [1]);

    t.done();
};



exports.test_pipe_1 =
function (t) {
    var executed = [];

    var plugins = [
        {
            name: 'foo',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(1);
                return [1, 2, 3];
            }
        }, {
            name: 'bar',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3]);
                executed.push(2);
                return [2, 3];
            }
        }, {
            name: 'baz',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [2, 3]);
                executed.push(3);
                return [2];
            }
        }
    ];

    var allocator = new Allocator(logStub);

    var results = allocator._pipe(plugins, [1, 2, 3, 4], { foo: 1 });
    var serverStub        = results[0];
    var visitedAlgorithms = results[1];

    t.deepEqual(serverStub, [2]);
    t.deepEqual(executed, [1, 2, 3]);
    t.deepEqual(visitedAlgorithms, plugins);

    t.done();
};



exports.test_pipe_2 =
function (t) {
    var executed = [];

    var plugins = [
        {
            name: 'foo',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(1);
                return [1, 2, 3];
            }
        }, {
            name: 'bar',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3]);
                executed.push(2);
                return [];
            }
        }, {
            name: 'baz',
            run: function (log, state, servers, vmDetails) {
                t.ok(false);
            }
        }
    ];

    var allocator = new Allocator(logStub);

    var results = allocator._pipe(plugins, [1, 2, 3, 4], { foo: 1 });
    var serverStub        = results[0];
    var visitedAlgorithms = results[1];

    t.deepEqual(serverStub, []);
    t.deepEqual(executed, [1, 2]);
    t.deepEqual(visitedAlgorithms, plugins.slice(0, 2));

    t.done();
};



exports.test_or_1 =
function (t) {
    var executed = [];

    var plugins = [
        {
            name: 'foo',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(1);
                return [];
            }
        }, {
            name: 'bar',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(2);
                return [];
            }
        }, {
            name: 'baz',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(3);
                return [];
            }
        }
    ];

    var allocator = new Allocator(logStub);

    var results = allocator._or(plugins, [1, 2, 3, 4], { foo: 1 });
    var serverStub        = results[0];
    var visitedAlgorithms = results[1];

    t.deepEqual(serverStub, []);
    t.deepEqual(executed, [1, 2, 3]);
    t.deepEqual(visitedAlgorithms, plugins);

    t.done();
};



exports.test_or_2 =
function (t) {
    var executed = [];

    var plugins = [
        {
            name: 'foo',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(1);
                return [];
            }
        }, {
            name: 'bar',
            run: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(2);
                return [1, 2];
            }
        }, {
            name: 'baz',
            run: function (log, state, servers, vmDetails) {
                t.ok(false);
            }
        }
    ];

    var allocator = new Allocator(logStub);

    var results = allocator._or(plugins, [1, 2, 3, 4], { foo: 1 });
    var serverStub        = results[0];
    var visitedAlgorithms = results[1];

    t.deepEqual(serverStub, [1, 2]);
    t.deepEqual(executed, [1, 2]);
    t.deepEqual(visitedAlgorithms, plugins.slice(0, 2));

    t.done();
};



exports.test_cleanup =
function (t) {
    var executed = [];

    var dup = {
        name: 'dup',
        post: function (log, state, servers, vmDetails) {
            t.deepEqual(vmDetails, { foo: 1 });
            t.deepEqual(servers, [1, 2, 3, 4]);
            executed.push(1);
        }
    };

    var plugins = [
        dup,
        {
            name: 'foo',
            post: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(2);
            }
        }, {
            name: 'bar'
        },
        dup,
        {
            name: 'baz',
            post: function (log, state, servers, vmDetails) {
                t.deepEqual(vmDetails, { foo: 1 });
                t.deepEqual(servers, [1, 2, 3, 4]);
                executed.push(3);
            }
        }
    ];

    var allocator = new Allocator(logStub);
    allocator._cleanup(plugins, [1, 2, 3, 4], { foo: 1 });

    t.deepEqual(executed, [3, 1, 2]);

    t.done();
};



exports.test_massageServerData =
function (t) {
    var serversInfo = [
        {
            memory_total_bytes: 2942881792,
            reservation_ratio: 0.15,
            sysinfo: {
                'Zpool Size in GiB': 39,
                'CPU Total Cores': 16
            },
            vms: {
                '1ac434da-01aa-4663-8420-d3524ed1de0c': {
                    cpu_cap: 350,
                    quota: 25,
                    max_physical_memory: 2048
                },
                'b3d04682-536f-4f09-8170-1954e45e9e1c': {
                    cpu_cap: 350,
                    quota: 5,
                    max_physical_memory: 128
                }
            }
        },
        {
            memory_total_bytes: 9132881112,
            reservation_ratio: 0.25,
            sysinfo: {
                'Zpool Size in GiB': 52,
                'CPU Total Cores': 24
            },
            vms: {
                '62559b33-4f3a-4505-a942-87cc557fdf4e': {
                    cpu_cap: 350,
                    quota: 20,
                    max_physical_memory: 512
                },
                '335498f7-a1ed-420c-8367-7f2769ca1e84': {
                    cpu_cap: 350,
                    quota: 10,
                    max_physical_memory: 4096
                }
            }
        },
        {
            overprovision_ratios: { ram: 1.5 },
            memory_total_bytes: 9132881112,
            reservation_ratio: 0.15,
            sysinfo: {
                'Zpool Size in GiB': 52,
                'CPU Total Cores': 32
            },
            vms: {
                '62559b33-4f3a-4505-a942-87cc557fdf4e': {
                    cpu_cap: 350,
                    quota: 20,
                    max_physical_memory: 512
                },
                '335498f7-a1ed-420c-8367-7f2769ca1e84': {
                    cpu_cap: 350,
                    quota: 10,
                    max_physical_memory: 4096
                }
            }
        },
        {
            overprovision_ratios: { ram: 1.5, disk: 2.0, cpu: 2.0 },
            memory_total_bytes: 9132881112,
            reservation_ratio: 0.15,
            sysinfo: {
                'Zpool Size in GiB': 52,
                'CPU Total Cores': 32
            },
            vms: {
                'd251001f-57eb-4360-a04a-96d7d20a520c': {
                    cpu_cap: 700,
                    quota: 20,
                    max_physical_memory: 512
                },
                '9dd471a6-4679-4201-a02d-5e824deefc3e': {
                    cpu_cap: 200,
                    quota: 10,
                    max_physical_memory: 4096
                }
            }
        }

    ];

    var allocator = new Allocator(logStub);
    serversInfo = allocator._massageServerData(serversInfo);

    t.equal(serversInfo[0].unreserved_disk, 9216);
    t.equal(serversInfo[0].unreserved_ram,  209);
    t.equal(serversInfo[0].unreserved_cpu,  900);

    t.equal(serversInfo[1].unreserved_disk, 22528);
    t.equal(serversInfo[1].unreserved_ram,  1924);
    t.equal(serversInfo[1].unreserved_cpu,  1700);

    t.equal(serversInfo[2].unreserved_disk, 22528);
    t.equal(serversInfo[2].unreserved_ram,  4331);
    t.equal(serversInfo[2].unreserved_cpu,  2500);

    t.equal(serversInfo[3].unreserved_disk, 37888);
    t.equal(serversInfo[3].unreserved_ram,  4331);
    t.equal(serversInfo[3].unreserved_cpu,  2750);

    t.done();
};



exports.test_loadAvailableAlgorithms =
function (t) {
    var allocator = new Allocator(logStub);
    var algorithms = allocator._loadAvailableAlgorithms();

    var names = Object.keys(algorithms).sort();

    var expectedNames = [
        'hard-filter-headnode',
        'hard-filter-large-servers',
        'hard-filter-min-cpu',
        'hard-filter-min-disk',
        'hard-filter-min-ram',
        'hard-filter-overprovision-ratios',
        'hard-filter-owner-same-racks',
        'hard-filter-owner-same-servers',
        'hard-filter-platform-versions',
        'hard-filter-reserved',
        'hard-filter-running',
        'hard-filter-setup',
        'hard-filter-traits',
        'hard-filter-vlans',
        'identity',
        'pick-random',
        'pick-weighted-random',
        'soft-filter-large-servers',
        'soft-filter-owner-many-zones',
        'soft-filter-recent-servers',
        'sort-2adic',
        'sort-min-ram',
        'sort-ram'
    ];

    t.deepEqual(names, expectedNames);

    t.done();
};



exports.test_loadAlgorithm =
function (t) {
    var allocator = new Allocator(logStub);
    var algorithm = allocator._loadAlgorithm('hard-filter-headnode');

    t.equal(algorithm.name, 'Servers which are not headnodes');

    t.done();
};



exports.test_createExpression =
function (t) {
    var description = [
        'or', ['pipe', 'hard-filter-headnode',
                       'hard-filter-min-disk'],
              ['pipe', 'hard-filter-running',
                       'hard-filter-setup',
                       'hard-filter-traits']
    ];

    var allocator = new Allocator(logStub);
    var availableAlgorithms = allocator._loadAvailableAlgorithms();
    var expression = allocator._createExpression(description,
                                                 availableAlgorithms);

    var expectedExpression = [
        'or', ['pipe', availableAlgorithms['hard-filter-headnode'],
                       availableAlgorithms['hard-filter-min-disk']],
              ['pipe', availableAlgorithms['hard-filter-running'],
                       availableAlgorithms['hard-filter-setup'],
                       availableAlgorithms['hard-filter-traits']]
    ];

    t.deepEqual(expectedExpression, expression);

    t.done();
};
