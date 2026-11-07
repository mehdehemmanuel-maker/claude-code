# 0009. Angle stays dimensionless; kinds keep apart what dimensions cannot

Date: 2026-10-31. State: proposed (from research 24; to be confirmed when spec 10 T11 starts).

## Context

The wire check compares dimensions only, so 60 rpm into Hz gives 6.283 Hz, torque wires to energy and Gy to Sv. Two
ways out: make the radian a base dimension (proposed by Quincey and Mohr; UCUM and Boost.Units keep angle separate), or
keep angle dimensionless as the SI does and tell quantities apart by kind (VIM, ISO 80000-1, Modelica's `quantity`,
mp-units' quantity specs).

## Options

1. Radian as a base dimension in `Dim`: every law with an angle in it must change
2. Angle dimensionless; every port carries a kind; crossing kinds only through named bridges

## Choice

The second. The laws stay as they are; the check moves to kinds; 2π appears only in a named bridge from rotational
frequency to angular speed.

## The assumption it rests on

That a kind on every port is cheap to infer (`quantityOf`) and to confirm.

## When to test it again

When T11 lands: if more than a few ports need a person to name their kind, revisit. (State 2026-11-01: T11 landed for
units that name their kind; no port needed a person yet; ports with no unit are still open.)
