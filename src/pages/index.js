import { Box } from 'theme-ui'
import { useState, useMemo, useEffect } from 'react'
import { gql, useLazyQuery } from '@apollo/react-hooks'
import { withApollo } from '../apollo/client'
import { useTable, useSortBy } from 'react-table'

const Index = () => {
  const mapData = useMemo(
    () => (row) => {
      return {
        epoch: row.id,
        startBlock: `#${row.startBlock}`,
        endBlock: `#${row.endBlock}`,
        queryFees: Math.round((100 * row.queryFeesCollected) / 1000000000000000000) / 100,
        totalRewards: Math.round((100 * row.totalRewards) / 1000000000000000000) / 100,
      }
    },
    [],
  )
  const pageSize = useMemo(() => 10, [])
  const [pageOffset, setPageOffset] = useState(0)
  const [dataValues, setDataValues] = useState([])

  const data = useMemo(() => dataValues, [dataValues, pageSize, pageOffset])
  const columns = useMemo(
    () => [
      {
        Header: `EPOCH`,
        accessor: `epoch`,
      },
      {
        Header: `START BLOCK`,
        accessor: `startBlock`,
      },
      {
        Header: `END BLOCK`,
        accessor: `endBlock`,
      },
      {
        Header: `QUERY FEES`,
        accessor: `queryFees`,
      },
      {
        Header: `TOTAL REWARDS`,
        accessor: `totalRewards`,
      },
    ],
    [],
  )

  const [numTotalRows, setNumTotalRows] = useState(0)
  const numFetchedRows = useMemo(() => data.length, [data])
  const [searchValue, setSearchValue] = useState(``)

  const [getInitialEpoches, getInitialEpochesRes] = useLazyQuery(gql`
    query getInitialEpoches($first: Int!) {
      epoches(first: $first) {
        id
        startBlock
        endBlock
        queryFeesCollected
        totalRewards
      }
    }
  `)
  const [getTotalEpoches, getTotalEpochesRes] = useLazyQuery(gql`
    query getTotalEpoches {
      epoches(first: 1000) {
        id
      }
    }
  `)
  const [getAppendEpoches, getAppendEpochesRes] = useLazyQuery(gql`
    query getAppendEpoches($first: Int!, $skip: Int!) {
      epoches(first: $first, skip: $skip) {
        id
        startBlock
        endBlock
        queryFeesCollected
        totalRewards
      }
    }
  `)
  const [getSearchedEpoches, getSearchedEpochesRes] = useLazyQuery(gql`
    query getSearchedEpoches($first: Int!, $filter: Int!) {
      epoches(where: { startBlock: $filter }, first: $first) {
        id
        startBlock
        endBlock
        queryFeesCollected
        totalRewards
      }
    }
  `)

  useEffect(() => {
    getInitialEpoches({ variables: { first: pageSize } })
  }, [])
  useEffect(() => {
    if (getInitialEpochesRes.data?.epoches) {
      setDataValues(getInitialEpochesRes.data.epoches.map(mapData))
    }
  }, [getInitialEpochesRes.data])

  useEffect(() => {
    getTotalEpoches()
  }, [])
  useEffect(() => {
    if (getTotalEpochesRes.data?.epoches) {
      console.log(getTotalEpochesRes.data?.epoches.length)
      setNumTotalRows(getTotalEpochesRes.data?.epoches.length)
    }
  }, [getTotalEpochesRes.data])

  const onClickLoadMore = () => {
    getAppendEpoches({
      variables: { first: pageSize, skip: pageSize + pageOffset * pageSize },
    })
    setPageOffset(pageOffset + 1)
  }
  useEffect(() => {
    if (getAppendEpochesRes.data?.epoches) {
      setDataValues((oldData) => [
        ...oldData,
        ...getAppendEpochesRes.data.epoches.map(mapData),
      ])
    }
  }, [getAppendEpochesRes.data])

  const onSearch = (value) => {
    getSearchedEpochesRes.data = null
    getSearchedEpoches({
      variables: {
        filter: Number(value),
        first: pageSize,
      },
    })
  }
  useEffect(() => {
    if (getSearchedEpochesRes.data?.epoches) {
      setDataValues(getSearchedEpochesRes.data.epoches.map(mapData))
    }
  }, [getSearchedEpochesRes.data])

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: {
        sortBy: [{ id: `startBlock`, desc: true }],
        sortDescFirst: true,
      },
    },
    useSortBy,
  )
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = tableInstance

  return (
    <Box>
      <Box>
        <h1>Epochs</h1>
        <input
          value={searchValue}
          placeholder={`🔍Search`}
          onChange={(e) => {
            setSearchValue(e.target.value)
            if (e.target.value === ``) {
              getInitialEpochesRes.data = null
              getInitialEpoches({ variables: { first: pageSize } })
            }
          }}
          onKeyPress={(e) => {
            const keyCode = e.code || e.key
            if (e.target.value !== `` && keyCode == `Enter`) {
              onSearch(e.target.value)
            }
          }}
        />
      </Box>
      <Box>
        <table {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                    {column.render(`Header`)}
                    <span>
                      {column.isSorted ? (column.isSortedDesc ? ` ⬇` : ` ⬆`) : ` ↕️`}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row) => {
              prepareRow(row)
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map((cell) => (
                    <td {...cell.getCellProps()}>{cell.render(`Cell`)}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        <Box>{`${numFetchedRows} of ${numTotalRows}`}</Box>
      </Box>
      {numFetchedRows < numTotalRows && (
        <button onClick={(e) => onClickLoadMore(e.target.value)}>Load More</button>
      )}
    </Box>
  )
}

export default withApollo(Index, { ssr: false })
