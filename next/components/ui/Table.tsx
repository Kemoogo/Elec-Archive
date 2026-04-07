"use client";

import type { ReactNode } from 'react';
import { cn } from "@/lib/utils";

export type TableColumn<T extends object> = {
    header: ReactNode;
    accessor?: string;
    children?: TableColumn<T>[];
    render?: (value: unknown, row: T) => React.ReactNode;
    isNumeric?: boolean;
    className?: string;
    headerClassName?: string;
    tdClassName?: string;
    minWidth?: boolean;
    cellAlign?: "right" | "center" | "left";
    headerAlign?: "right" | "center" | "left";
    emptyValue?: string;
};

export type TableRow = Record<string, unknown> & { id?: string | number; className?: string };

type Props<T extends object> = {
    columns: TableColumn<T>[];
    data: T[];
    showSerialNumber?: boolean;
    theadClassName?: string;
    thClassName?: string;
    tdClassName?: string;
    onRowClick?: (row: T) => void;
};

type GenericTableColumn = TableColumn<object>;
type TableAlign = NonNullable<GenericTableColumn["cellAlign"]>;

const ALIGN_CLASS: Record<TableAlign, string> = {
    right: "text-right",
    center: "text-center",
    left: "text-left",
};

function getAlignClass(align: TableAlign) {
    return ALIGN_CLASS[align];
}

function getHeaderAlign<T extends object>(column: TableColumn<T>): TableAlign {
    return column.headerAlign || column.cellAlign || "right";
}

function getCellAlign<T extends object>(column: TableColumn<T>): TableAlign {
    return column.cellAlign || column.headerAlign || "right";
}

const getHeaderDepth = <T extends object>(columns: TableColumn<T>[]): number => {
    return columns.reduce((max, col) => {
        if (col.children && col.children.length > 0) {
            return Math.max(max, 1 + getHeaderDepth(col.children));
        }
        return Math.max(max, 1);
    }, 0);
};

const buildHeaderRows = <T extends object>(columns: TableColumn<T>[], depth: number): TableColumn<T>[][] => {
    const rows: TableColumn<T>[][] = Array.from({ length: depth }, () => []);
    const fillRows = (cols: TableColumn<T>[], lvl: number) => {
        cols.forEach(col => {
            rows[lvl].push(col);
            if (col.children) fillRows(col.children, lvl + 1);
        });
    };
    fillRows(columns, 0);
    return rows;
};

export default function MainTable<T extends object>({
    columns,
    data,
    showSerialNumber = false,
    theadClassName = "bg-[var(--color-primary)] text-white text-xs",
    thClassName = "px-5 py-3",
    tdClassName = "px-5 py-3 text-xs font-bold text-slate-600 whitespace-nowrap",
    onRowClick,
}: Props<T>) {
    const headerDepth = getHeaderDepth(columns);
    const headerRows = buildHeaderRows(columns, headerDepth);

    const getValue = (value: unknown, emptyValue = "-"): unknown => {
        if (value === null || value === undefined || value === '') {
            return emptyValue;
        }
        return value;
    };

    return (
        <div className="pt-0 pb-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full table-auto min-w-full">
                    <thead className={theadClassName}>
                        {headerRows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {rowIndex === 0 && showSerialNumber && (
                                    <th className={`${thClassName} text-center`} rowSpan={headerDepth} style={{ width: '1%', whiteSpace: 'nowrap' }}>
                                        م
                                    </th>
                                )}
                                {row.map((col, colIndex) => {
                                    const hasChildren = col.children && col.children.length > 0;
                                    const colspan = hasChildren
                                        ? col.children!.length
                                        : 1;
                                    const rowspan = hasChildren ? 1 : headerDepth - rowIndex;

                                    let headerPadding = thClassName;
                                    const headerAlignClass = getAlignClass(getHeaderAlign(col));
                                    if (hasChildren) {
                                        headerPadding = `px-4 pt-2 pb-1 ${headerAlignClass}`;
                                    } else if (rowIndex > 0) {
                                        headerPadding = `px-4 pt-1 pb-2 ${headerAlignClass}`;
                                    } else {
                                        headerPadding = `${thClassName} ${headerAlignClass}`;
                                    }

                                    return (
                                        <th
                                            key={colIndex}
                                            className={`${headerPadding} ${col.headerClassName || ""}`}
                                            colSpan={colspan}
                                            rowSpan={rowspan}
                                            style={{
                                                width: col.minWidth ? '1%' : undefined,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {col.header}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>

                    <tbody className="divide-y divide-slate-50">
                        {data.map((row, i) => {
                            const rowWithMeta = row as Record<string, unknown> & { id?: string | number; className?: string };
                            return (
                            <tr
                                key={rowWithMeta.id ?? i}
                                onClick={() => onRowClick?.(row)}
                                className={cn(
                                    "transition-colors",
                                    onRowClick ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50/80",
                                    rowWithMeta.className
                                )}
                            >
                                {showSerialNumber && <td className={`${tdClassName} font-mono text-center`} style={{ width: '1%', whiteSpace: 'nowrap' }}>{i + 1}</td>}
                                {columns.map((col, colIndex) => {
                                    if (col.children && col.children.length > 0) {
                                        return col.children.map((child, childIndex) => {
                                            const value = child.accessor ? getValue(rowWithMeta[child.accessor], child.emptyValue) : null;
                                            const whiteSpace = typeof value === "string" && value.includes("\n") ? "pre-line" : "nowrap";
                                            const cellAlignClass = getAlignClass(getCellAlign(child));
                                            return (
                                                <td
                                                    key={`${colIndex}-${childIndex}`}
                                                    className={`${tdClassName} ${child.tdClassName || ""} ${child.isNumeric ? 'font-mono' : ''} ${child.className || ""} ${cellAlignClass}`}
                                                    style={{
                                                        width: child.minWidth ? '1%' : undefined,
                                                        whiteSpace
                                                    }}
                                                >
                                                    {child.render ? child.render(value, row) : value as ReactNode}
                                                </td>
                                            );
                                        });
                                    }
                                    const value = col.accessor ? getValue(rowWithMeta[col.accessor], col.emptyValue) : null;
                                    const whiteSpace = typeof value === "string" && value.includes("\n") ? "pre-line" : "nowrap";
                                    const cellAlignClass = getAlignClass(getCellAlign(col));
                                    return (
                                        <td
                                            key={colIndex}
                                            className={`${tdClassName} ${col.tdClassName || ""} ${col.isNumeric ? 'font-mono' : ''} ${col.className || ""} ${cellAlignClass}`}
                                            style={{
                                                width: col.minWidth ? '1%' : undefined,
                                                whiteSpace
                                            }}
                                        >
                                            {col.render ? col.render(value, row) : value as ReactNode}
                                        </td>
                                    );
                                })}
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
