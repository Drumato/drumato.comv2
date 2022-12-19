---
title: "Replace FRR Zebra SRv6 Manager with YANG Backend"
date: "2022-01-04"
lastmod: "2022-01-04"
tags: ["frr", "srv6"]
---


Now I'm playing with [FRRouting](https://frrouting.org/) and contributing with tiny PRs(my PRs have merged twice).
Today I'll introduce my recent PoC that achieves replacement SRv6 Manager with YANG backend.
This PoC is related with FRR Northbound API so I'm interesting in it.
This PoC is incomplete but it's maybe helpful if you want to know about the FRR's mechanism of Northbound API.
You can see the PoC in [here](https://github.com/Drumato/frr/pull/4) .  

---

## Prerequisites

### FRR Zebra SRv6 Manager

In FRR, Zebra daemon manages SRv6 resources intensively.
And routing daemons(bgpd/isisd/etc) requests the resources to Zebra.
Zebra provides the resource's ownerships to them.
It's just a **"Server - Client" model** as you know.
there is a component called **SRv6 Manager** in zebra.
it's responsible for managing SRv6 resources and the requests to them.
I recommend you to read [this topotest](https://github.com/FRRouting/frr/tree/frr-8.1/tests/topotests/bgp_srv6l3vpn_to_bgp_vrf) that demonstrates VPNv6 with BGP SRv6 for understanding SRv6 Manager.  

### Northbound gRPC

In FRR you can use **vtysh** to configure dynamically.
I think vtysh is the most popular way to interact FRR daemons.
vtysh provides the experiences that are almost the same as Cisco's interactive CLI.  

On the other hand, FRR provides another way called **Northbound gRPC**.
It enables you to configure FRR daemons via gRPC communications.
When FRR users want to interact with FRR daemons they only need to implement gRPC clients.
You can see the detailed documentation in [here](http://docs.frrouting.org/en/latest/grpc.html) and [here](http://docs.frrouting.org/projects/dev-guide/en/latest/grpc.html) .

### FRR YANG backend

FRR achieves the Northbound gRPC with following method.

- modeling FRR configuration/operational-data by using [YANG](https://datatracker.ietf.org/doc/html/rfc7950)
- attaching **Northbound API callbacks** into the data model

Each routing daemon doesn't need to implement each API response handler.
Requests from clients contain an XPath and corresponding callback is called automatically.

There are some merits in centralizing configurations/operational-data into YANG definitions.
First, network operators only need to refer YANG files if operators want to know about the data models and their structures.
network operators are familiar with YANG.
And YANG doesn't depend on any programming languages and implementations.
Second, We can refer network vendor's YANG models in [here](https://github.com/YangModels/yang).
You only need to refer them if you want to unify the operations among vendor's appliances and yours.  

---

## Main

### Current Status

As described above, there is a big motivation to replace FRR components with YANG backend.
In fact FRR community set the roadmap to replace all daemons with YANG backend.
Now the new management daemon called **mgmtd** is being proposed(I'll describe it later).
So I wanted to be familiar with FRR by implementing a YANG backend.

Now SRv6 Manager doesn't support Northbound API.
But SRv6 Manager is responsible for important things in small code-base.
I had read overall of SRv6 Manager roughly so I didn't think it's difficult to replace for me(in fact I faced on some issues later).
So I decided to implement SRv6 Manager YANG backend.

### Goals

- replace SRv6 components in practical ways
  - daemon side
  - SRv6 Manager vtysh commands
- of course I keep SRv6 Manager correct
  - I'm careful of srv6_locator topotest

---

## Current Implementation

I considered the PoC of this task as three sub-tasks.

- define YANG files
- define and implement API callbacks that are corresponding to YANG data node
- change the logic of SRv6 vtysh commands

### Define YANG files

First of all I defined YANG files.
The YANG files are the foundation of daemon/vtysh's implementation.
So I had to design them carefully.  

So I referred the YANG models of Cisco IOS-XR 7.5.1.
I thought they're already well-defined so they're good references for me.
There are some YANG files they're related to SRv6, `cfg` and `datatypes` and `oper`.
In FRR core logic I had to focus `cfg` and `datatypes` YANG.

- [Cisco-IOS-XR-segment-routing-srv6-oper.yang](https://github.com/YangModels/yang/blob/master/vendor/cisco/xr/751/Cisco-IOS-XR-segment-routing-srv6-oper.yang)
- [Cisco-IOS-XR-segment-routing-srv6-datatypes.yang](https://github.com/YangModels/yang/blob/master/vendor/cisco/xr/751/Cisco-IOS-XR-segment-routing-srv6-datatypes.yang)
- [Cisco-IOS-XR-segment-routing-srv6-cfg.yang](https://github.com/YangModels/yang/blob/master/vendor/cisco/xr/751/Cisco-IOS-XR-segment-routing-srv6-cfg.yang)

And I saw `segment-routing-srv6-cfg:srv6` container-block just augments `segment-routing-ms-cfg:sr` block.
`segment-routing-ms-cfg` is the entire model of Segment-Rouring.
For now there was no segment-routing manager in zebra(described later) but I didn't care about that.

- `frr-srv6.yang` ... refers `segment-routing-srv6-datatypes`
- `frr-zebra-sr.yang` ... refers `segment-routing-ms-cfg`
  - that isn't related to SRv6 Manager but it's needed for consistency
- `frr-zebra-srv6.yang` ... refers `segment-routing-srv6-cfg`

### Northbound API Callbacks

Next I implemented Northbound API callbacks they're corresponding to each YANG node.
For instance, `router isis AREA_TAG` command creates a new isisd instance in isisd.
this command also instantiates a new YANG list-node entry and stores it into isisd's YANG data tree.
At this time the corresponding `create` callback is called automatically.
I'll describe some kinds of Northbound API callbacks.

|    Callback    |     Type      |                                              Description                                              |
| :------------: | :-----------: | :---------------------------------------------------------------------------------------------------: |
|    `create`    | Configuration |                      at creation of a list-node entry/type empty/leaf-list entry                      |
|    `modify`    | Configuration |                                 at modification of a leaf-node value                                  |
|   `destroy`    | Configuration |                         at deletion of a list-node entry/leaf-list entry/etc                          |
|   `get_elem`   |   Operation   |                              at retrieving of a leaf/leaf-list entry/etc                              |
| `lookup_entry` |   Operation   |                           at searching of a list-node entry with given key                            |
|   `cli_show`   |   Operation   |                         prints a CLI command that is corresponding to a node                          |
| `cli_show_end` |   Operation   | if a node(container/list-node/etc) opens CLI command block this callback prints the block's beginning |

Next task is to implement these callbacks into each YANG model.
I defined new `struct frr_yang_module_info` and passed it to the instantiation function of Zebra daemon.  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_nb.c#L31>  

```c
/* stripped */
const struct frr_yang_module_info frr_zebra_srv6_info = {
  .name = "frr-zebra-srv6",
  .nodes = {
    {
      .xpath = "/frr-zebra-sr:sr/frr-zebra-srv6:srv6",
      .cbs = {
        .cli_show = cli_show_segment_routing_srv6,
        .cli_show_end = cli_show_segment_routing_srv6_end,
      },
      .priority = NB_DFLT_PRIORITY - 1,
    },
    {
      .xpath = "/frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators",
      .cbs = {
        .cli_show = cli_show_srv6_locators,
        .cli_show_end = cli_show_srv6_locators_end,
      },
    },
    {
      .xpath = "/frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators/locators",
      .cbs = {
        .cli_show = cli_show_srv6_locators_locators,
        .cli_show_end = cli_show_srv6_locators_locators_end,
      },
    },
    {
      .xpath = "/frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators/locators/locator",
      .cbs = {
        .cli_show = cli_show_srv6_locator,
        .cli_show_end = cli_show_srv6_locator_end,
        .create = nb_lib_srv6_locator_create,
        .destroy = nb_lib_srv6_locator_destroy,
      },
    },
    /* stripped */
  }
};
```

I also defined `struct frr_yang_module_info frr_zebra_sr_info` same as `frr_zebra_srv6_info`.
So finally I just needed to implement specified callbacks as above one by one.
For instance I'll show youw `nb_lib_srv6_locator_create`.
that is a typical `create` callback.
that is called when a new SRv6 locator is created.  

First of all, In FRR we should manage the both of YANG data tree and C data-structures.
In this case `nb_lib_srv6_locator_create` calls `zebra_srv6_locator_add()` to update the master variable of SRv6 Manager.  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_nb_config.c#L29>  

```c
// stripped

/*
 * XPath: /frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators/locators/locator
 */
int nb_lib_srv6_locator_create(struct nb_cb_create_args *args)
{
  struct srv6_locator *loc;
  struct srv6_locator_chunk *chunk;
  const char *loc_name;

  if (args->event != NB_EV_APPLY) return NB_OK;

  loc_name = yang_dnode_get_string(args->dnode, "./name");
  loc = zebra_srv6_locator_lookup(loc_name);
  if (!loc) {
    /* SRv6 manager pre-allocates one chunk for zclients */
    loc = srv6_locator_alloc(loc_name);
    chunk = srv6_locator_chunk_alloc();
    chunk->proto = NO_PROTO;
    listnode_add(loc->chunks, chunk);
  }

  zebra_srv6_locator_add(loc);
  nb_running_set_entry(args->dnode, loc);

  return NB_OK;
}

// stripped
```

Next example is `nb_lib_srv6_locator_prefix_modify`.
that is called when `leaf prefix` is modified.  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_nb_config.c#L124>  

```c
// stripped

/*
 * XPath: /frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators/locators/locator/prefix/prefix
 */
int nb_lib_srv6_locator_prefix_modify(struct nb_cb_modify_args *args) {
  struct srv6_locator *locator;

  if (args->event != NB_EV_APPLY) return NB_OK;

  locator = nb_running_get_entry(args->dnode, NULL, true);
  yang_dnode_get_prefix(&locator->prefix, args->dnode, NULL);

  return NB_OK;
}

// stripped
```

Last I passed `struct frr_yang_module_info` into `FRR_DAEMON_INFO` in `zebra/main.c`.

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/main.c#L261>  

```c
// stripped

static const struct frr_yang_module_info *const zebra_yang_modules[] = {
  &frr_filter_info,
  &frr_interface_info,
  &frr_route_map_info,
  &frr_zebra_info,
  &frr_vrf_info,
  &frr_routing_info,
  &frr_srv6_info, // added
  &frr_zebra_route_map_info,
  &frr_zebra_sr_info, // added
  &frr_zebra_srv6_info, // added
};

// stripped
```

### SRv6 Manager CLI

Next I implemented vtysh commands side.
Previously SRv6 Manager vtysh commands directly called daemon's functions.
So replace them with just calling Northbound API.
First I'll show `srv6_locator_cmd` that transitions to `SRV6_LOC_NODE`.  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_vty.c#L246>  

```c
// stripped

DEFPY_YANG_NOSH(srv6_locator,
                srv6_locator_cmd,
                "locator LOC_NAME$name",
                SRV6_LOCATOR_CMD_STR)
{
  char xpath[XPATH_MAXLEN];
  int rv;

  snprintf(xpath, sizeof(xpath),
           "/frr-zebra-sr:sr"
           "/frr-zebra-srv6:srv6"
           "/locators/locators/locator[name='%s']", name);

  nb_cli_enqueue_change(vty, xpath, NB_OP_CREATE, NULL);

  rv = nb_cli_apply_changes(vty, xpath);
  if (rv == CMD_SUCCESS)
    VTY_PUSH_XPATH(SRV6_LOC_NODE, xpath);

  return rv;
}

// stripped
```

I'll also show an example of a `cli_show` callback.

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_vty.c#L405>  

```c
// stripped

void cli_show_srv6_locator(struct vty *vty, const struct lyd_node *dnode,
      bool show_defaults)
{
  const char *loc_name = NULL;

  loc_name = yang_dnode_get_string(dnode, "./name");
  vty_out(vty, "   locator %s\n", loc_name);
}

// stripped
```

finally all configurations can be printed by `cli_show` callbacks.
`zebra_sr_config()` function is called when `show-running` command is called.
So I replaced it with `cli_show` callbacks.
FRR provides `nb_cli_show_dnode_cmds()` , that recursively calls `cli_show` callback from a given dnode.  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_vty.c#L453>  

```c
// stripped

static int zebra_sr_config(struct vty *vty)
{
  int write_count = 0;
  struct lyd_node *dnode;

  if (zebra_srv6_is_enable()) {
    dnode = yang_dnode_get(running_config->dnode, 
                "/frr-zebra-sr:sr"
                "/frr-zebra-srv6:srv6");

    if (dnode) {
      nb_cli_show_dnode_cmds(vty, dnode, false);
      write_count++;
    }
  }

  return write_count;
}

// stripped
```

---

## Future Works

So I've finished to pass srv6_locator topotest with YANG backend.
But there are some issues yet.

### `show yang operational-data`

For now this PoC only supports **configurational** callbacks.
If user calls **operational** callbacks, it doesn't work correctly.
this indicates the `show yang operational-data` command will fail.  

To achieve it, I should know how to use `get_keys/get_next/get_elem/lookup_entry` callback.
those API don't have any comprehensive docs, so I'll have to read the existing implementations.  

### researching mgmtd

Now a new YANG-based management daemon called **mgmtd** is proposed to FRR.
this daemon will support following features.
I think the daemon will improve our development/operational experiences.

- Frontend Interface for all API clients
  - running/candidate/startup/etc databases
- Backend Interface for all FRR daemons
  - each daemon only needs to interact with mgmtd and can handle any config/data
  - this enables FRR daemons to unify implementations among them
- Candidate Config Commit Rollbacks/History

---

## Conclusion

Today I described my PoC and FRR current status.
If you want to know more informations, please check the FRR community(GitHub and Slack)!

---

## References

- <http://docs.frrouting.org/en/latest/grpc.html>
  - <http://docs.frrouting.org/projects/dev-guide/en/latest/grpc.html>
- [【インターンレポート】FRRouting IS-IS SRv6 Extension 設計と実装に関して](https://engineering.linecorp.com/ja/blog/internship2021-frrouting/)
- [zebra: srv6 manager](https://github.com/FRRouting/frr/pull/5865)
