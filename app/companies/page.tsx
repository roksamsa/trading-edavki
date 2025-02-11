"use client";

import React, { useEffect, useRef, useState } from "react";
import { ReactGrid, Row, Column } from "@silevis/reactgrid";
import { Button } from "@heroui/button";

import "@silevis/reactgrid/styles.css";

const getColumns = (): Column[] => [
  { columnId: "Symbol", width: 150, resizable: true },
  { columnId: "ISIN", width: 150, resizable: true },
  { columnId: "Name", width: 150, resizable: true },
  { columnId: "Address", width: 150, resizable: true },
];

const headerRow: Row = {
  rowId: "header",
  height: 60,
  cells: [
    { type: "header", text: "Symbol" },
    { type: "header", text: "ISIN" },
    { type: "header", text: "Name" },
    { type: "header", text: "Address" },
  ],
};

const mapDataToRows = (data: any[]): Row[] =>
  data.map((item, idx) => ({
    rowId: idx,
    height: 40,
    cells: [
      { type: "text", text: item.Symbol || "" },
      { type: "text", text: item.ISIN || "" },
      { type: "text", text: item.Name || "" },
      { type: "text", text: item.Address || "" },
    ],
  }));

const Companies = () => {
  const [columns, setColumns] = useState<Column[]>(getColumns());
  const [rows, setRows] = useState<Row[]>([headerRow]);

  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setColumns((prevColumns) => {
      // Calculate new column width based on the div width
      const newColumns = prevColumns.map((col) => {
        let width = col.width;

        if (divRef.current) {
          width = divRef.current.offsetWidth / prevColumns.length;
        }

        return { ...col, width: width ? width : col.width };
      });

      return newColumns;
    });
  }, []); // Empty dependency array to run on mount

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/companies/getCompanies", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch companies data");
        }

        const data = await res.json();
        const dataRows = mapDataToRows(data);
        setRows([headerRow, ...dataRows]);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };

    fetchCompanies();
  }, []);

  const handleColumnResize = (
    columnId: string | number,
    width: number,
    selectedColIds: (string | number)[],
  ) => {
    setColumns((prevColumns) => {
      const columnIndex = prevColumns.findIndex(
        (el) => el.columnId === columnId,
      );
      const resizedColumn = prevColumns[columnIndex];
      const updatedColumn = { ...resizedColumn, width };

      prevColumns[columnIndex] = updatedColumn;

      return [...prevColumns];
    });
  };

  const handleAddNewCompany = async () => {
    try {
      const res = await fetch("/api/companies/saveNewCompany", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Symbol: "New Company 123",
          Name: "New Company",
          Address: "New Address",
          ISIN: "New ISIN",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate XML");
      }

      const data = await res.json();
      const dataRows = mapDataToRows(data);
      setRows([headerRow, ...dataRows]);
      console.log("XML generated:", data);
    } catch (err) {
      console.error("Error generating XML:", err);
    }
  };

  return (
    <div className="page flex" ref={divRef}>
      <div className="page__content p-6">
        <div className="page__headline flex justify-between items-center">
          Companies
          <Button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onPress={handleAddNewCompany}
          >
            Add new company
          </Button>
        </div>
        <div className="page__content-container">
          {columns.length > 0 && rows.length > 1 && (
            <ReactGrid
              columns={columns}
              rows={rows}
              stickyTopRows={1}
              onColumnResized={handleColumnResize}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Companies;
