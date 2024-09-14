import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import axios from 'axios';
import 'primeicons/primeicons.css'; // Import PrimeIcons for the chevron-down icon

interface DataItem {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

const MyDataTable: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<DataItem[]>([]); // Tracks selected rows for the current page
  const [globalSelection, setGlobalSelection] = useState<DataItem[]>([]); // Tracks selected rows across all pages
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(10);
  const [selectionLimit, setSelectionLimit] = useState<number>(5); // Custom limit for row selection
  const op = useRef<OverlayPanel>(null); // Reference to the OverlayPanel

  // Fetch data when page changes
  useEffect(() => {
    fetchPageData(page);
  }, [page]);

  const fetchPageData = async (page: number) => {
    try {
      const response = await axios.get(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rowsPerPage}`);
      setData(response.data.data);
      setTotalRecords(response.data.pagination.total);
      updateSelectedRowsForPage(response.data.data); // Ensure selection persists across pages
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Handle page change
  const onPageChange = (event: { first: number; rows: number }) => {
    setPage(event.first / event.rows + 1);
  };

  // Handle row selection change (update global selection state)
  const rowSelectionChange = (e: { value: DataItem[] }) => {
    const newSelections = e.value;
    const updatedGlobalSelection = mergeSelections(newSelections);

    setGlobalSelection(updatedGlobalSelection); // Update global selection
    setSelectedRows(newSelections); // Update selected rows for the current page
  };

  // Merge new selections with existing ones (ensuring no duplicates)
  const mergeSelections = (newSelections: DataItem[]): DataItem[] => {
    const allSelections = [...globalSelection, ...newSelections];
    const uniqueSelections = Array.from(new Set(allSelections.map((item: DataItem) => item.id)))
      .map((id) => allSelections.find((item: DataItem) => item.id === id) as DataItem);
    return uniqueSelections;
  };

  // Update selected rows for the current page, ensuring global selection is applied
  const updateSelectedRowsForPage = (currentPageData: DataItem[]) => {
    const selectedOnPage = currentPageData.filter((item: DataItem) =>
      globalSelection.some((selected: DataItem) => selected.id === item.id)
    );
    setSelectedRows(selectedOnPage);
  };

  // Select the submitted number of rows across pages
  const selectRowsAcrossPages = async () => {
    let allSelections: DataItem[] = [];
    let currentPage = 1;

    while (allSelections.length < selectionLimit && currentPage <= Math.ceil(totalRecords / rowsPerPage)) {
      try {
        const response = await axios.get(`https://api.artic.edu/api/v1/artworks?page=${currentPage}&limit=${rowsPerPage}`);
        const newData = response.data.data;

        // Add only the non-duplicated rows to the selection
        const nonDuplicateSelections = newData.filter(
          (item: DataItem) => !allSelections.some((selected: DataItem) => selected.id === item.id)
        );

        allSelections = [...allSelections, ...nonDuplicateSelections].slice(0, selectionLimit);
        currentPage++;
      } catch (error) {
        console.error('Error fetching data:', error);
        break;
      }
    }

    setGlobalSelection(allSelections); // Set the global selection to the selected number of rows
    updateSelectedRowsForPage(data); // Update the current page's selected rows
    op.current?.hide(); // Close the overlay panel after submission
  };

  // Deselect all rows globally
  const deselectAllRows = () => {
    setGlobalSelection([]);
    setSelectedRows([]);
  };

  // Selection Panel with OverlayPanel for submitting the number of rows to select
  const RowSelectionPanel = () => (
    <div>
      <Button
        type="button"
        icon="pi pi-chevron-down"
        label={`Select Rows (${selectionLimit})`}
        onClick={(e) => op.current?.toggle(e)}
        className="p-button-text"
      />
      <OverlayPanel ref={op} dismissable>
        <div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Select number of rows:
              <input
                type="number"
                value={selectionLimit}
                onChange={(e) => setSelectionLimit(Number(e.target.value))}
                min={1}
                max={totalRecords}
              />
            </label>
          </div>
          <Button label="Submit" icon="pi pi-check" onClick={selectRowsAcrossPages} />
          <Button label="Deselect All" icon="pi pi-times" onClick={deselectAllRows} className="p-button-danger" />
        </div>
      </OverlayPanel>
    </div>
  );

  const header = (
    <div>
      <RowSelectionPanel />
    </div>
  );

  return (
    <div>
      <DataTable
        value={data}
        selection={selectedRows}
        onSelectionChange={rowSelectionChange}
        dataKey="id"
        paginator
        rows={rowsPerPage}
        totalRecords={totalRecords}
        lazy
        onPage={onPageChange}
        header={header}
        selectionMode="multiple"
      >
        <Column selectionMode="multiple" style={{ width: '3em' }} />
        <Column field="id" header="ID" />
        <Column field="title" header="Title" />
        <Column field="place_of_origin" header="Place of Origin" />
        <Column field="artist_display" header="Artist Display" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Date Start" />
        <Column field="date_end" header="Date End" />
      </DataTable>
    </div>
  );
};

export default MyDataTable;
